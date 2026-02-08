module payzee_escrow::escrow {
    use sui::coin::{Self, Coin};
    use sui::balance::{Self, Balance};
    use sui::tx_context::{Self, TxContext};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::event;

    // Error codes
    const EInsufficientBalance: u64 = 0;
    const EUnauthorized: u64 = 1;
    const EInvalidAmount: u64 = 2;

    // Escrow state object
    public struct Escrow<phantom T> has key, store {
        id: UID,
        depositor: address,
        merchant: address,
        amount: u64,
        balance: Balance<T>,
        card_id: vector<u8>,
        released: bool,
    }

    // Admin capability
    public struct AdminCap has key {
        id: UID,
    }

    // Events
    public struct DepositEvent has copy, drop {
        escrow_id: address,
        depositor: address,
        merchant: address,
        amount: u64,
        card_id: vector<u8>,
    }

    public struct ReleaseEvent has copy, drop {
        escrow_id: address,
        merchant: address,
        amount: u64,
    }

    public struct RefundEvent has copy, drop {
        escrow_id: address,
        depositor: address,
        amount: u64,
    }

    // Initialize function - called once when contract is published
    fun init(ctx: &mut TxContext) {
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };
        transfer::transfer(admin_cap, tx_context::sender(ctx));
    }

    // Create escrow and deposit USDC
    public entry fun deposit<T>(
        coin: Coin<T>,
        merchant: address,
        card_id: vector<u8>,
        ctx: &mut TxContext
    ) {
        let amount = coin::value(&coin);
        assert!(amount > 0, EInvalidAmount);

        let depositor = tx_context::sender(ctx);
        let escrow_id = object::new(ctx);
        let escrow_addr = object::uid_to_address(&escrow_id);

        let escrow = Escrow<T> {
            id: escrow_id,
            depositor,
            merchant,
            amount,
            balance: coin::into_balance(coin),
            card_id,
            released: false,
        };

        event::emit(DepositEvent {
            escrow_id: escrow_addr,
            depositor,
            merchant,
            amount,
            card_id,
        });

        transfer::share_object(escrow);
    }

    // Release funds to merchant (called by admin after payment confirmation)
    public entry fun release<T>(
        _admin: &AdminCap,
        escrow: &mut Escrow<T>,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.released, EUnauthorized);
        
        let amount = balance::value(&escrow.balance);
        assert!(amount > 0, EInsufficientBalance);

        let coin = coin::from_balance(balance::withdraw_all(&mut escrow.balance), ctx);
        escrow.released = true;

        event::emit(ReleaseEvent {
            escrow_id: object::uid_to_address(&escrow.id),
            merchant: escrow.merchant,
            amount,
        });

        transfer::public_transfer(coin, escrow.merchant);
    }

    // Refund to depositor (called by admin if payment fails)
    public entry fun refund<T>(
        _admin: &AdminCap,
        escrow: &mut Escrow<T>,
        ctx: &mut TxContext
    ) {
        assert!(!escrow.released, EUnauthorized);
        
        let amount = balance::value(&escrow.balance);
        assert!(amount > 0, EInsufficientBalance);

        let coin = coin::from_balance(balance::withdraw_all(&mut escrow.balance), ctx);
        escrow.released = true;

        event::emit(RefundEvent {
            escrow_id: object::uid_to_address(&escrow.id),
            depositor: escrow.depositor,
            amount,
        });

        transfer::public_transfer(coin, escrow.depositor);
    }

    // View functions
    public fun get_escrow_info<T>(escrow: &Escrow<T>): (address, address, u64, bool) {
        (escrow.depositor, escrow.merchant, escrow.amount, escrow.released)
    }
}
