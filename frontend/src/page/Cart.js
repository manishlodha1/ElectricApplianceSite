import React from 'react';
import { useSelector } from 'react-redux';
import CartProduct from "../component/CartProduct";
import empty from "../asset/empty.gif";
import toast from 'react-hot-toast';
import { loadStripe } from "@stripe/stripe-js";
import { useNavigate } from 'react-router';

const Cart = () => {
  const productCartItem = useSelector((state) => state.product.cartItem);
  const user = useSelector((state) => state.user);
  const navigate = useNavigate();

  // Helper function to parse price safely
  const parsePrice = (priceString) => {
    if (typeof priceString === "number") return priceString; // Already a number
    if (!priceString || typeof priceString !== "string") return 0; // Default to 0 for invalid values
    return parseFloat(priceString.replace(/,/g, '')) || 0; // Remove commas, convert to float
  };

  // Calculate total price
  const totalPrice = productCartItem.reduce((acc, curr) => {
    const itemPrice = parsePrice(curr.price); // Parse individual price
    const itemTotal = curr.total ? parsePrice(curr.total) : curr.qty * itemPrice; // Compute total if not present
    return acc + itemTotal; // Accumulate totals
  }, 0);

  // Calculate total quantity
  const totalQty = productCartItem.reduce((acc, curr) => {
    const qty = curr.qty ? parseInt(curr.qty, 10) : 0; // Parse quantity
    return acc + qty; // Accumulate quantities
  }, 0);

  // Handle payment process
  const handlePayment = async () => {
    if (user.email) {
      try {
        const stripePromise = await loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);
        const res = await fetch(`${process.env.REACT_APP_SERVER_DOMAIN}/checkout-payment`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            productCartItem.map((item) => ({
              ...item,
              price: parsePrice(item.price), // Ensure price is numeric
              total: parsePrice(item.total), // Ensure total is numeric
            }))
          ),
        });

        if (!res.ok) {
          console.error("Error during payment initialization:", await res.text());
          toast.error("Server error during payment initialization.");
          return;
        }

        const data = await res.json();
        toast.success("Redirecting to payment gateway...");
        stripePromise.redirectToCheckout({ sessionId: data });
      } catch (error) {
        console.error("Payment error:", error);
        toast.error("Payment failed. Please try again.");
      }
    } else {
      toast.error("You must be logged in to proceed with payment.");
      setTimeout(() => navigate("/login"), 1000);
    }
  };

  return (
    <div className="p-2 md:p-4">
      <h2 className="text-lg md:text-2xl font-bold text-slate-600">Your Cart Items</h2>
      {productCartItem.length > 0 ? (
        <div className="my-4 flex gap-3">
          {/* Cart Items */}
          <div className="w-full max-w-3xl">
            {productCartItem.map((item) => (
              <CartProduct
                key={item._id}
                id={item._id}
                name={item.name}
                image={item.image}
                category={item.category}
                qty={item.qty}
                total={parsePrice(item.total)} // Normalize total for display
                price={parsePrice(item.price)} // Normalize price for display
              />
            ))}
          </div>

          {/* Summary Section */}
          <div className="w-full max-w-md ml-auto">
            <h2 className="bg-blue-500 text-white p-2 text-lg">Summary</h2>
            <div className="flex w-full py-2 text-lg border-b">
              <p>Total Qty:</p>
              <p className="ml-auto w-32 font-bold">{totalQty}</p>
            </div>
            <div className="flex w-full py-2 text-lg border-b">
              <p>Total Price:</p>
              <p className="ml-auto w-32 font-bold">
                <span className="text-red-500">₹</span>{totalPrice.toFixed(2)}
              </p>
            </div>
            <button
              className="bg-red-500 w-full text-lg font-bold py-2 text-white"
              onClick={handlePayment}
            >
              Payment
            </button>
          </div>
        </div>
      ) : (
        <div className="flex w-full justify-center items-center flex-col">
          <img src={empty} alt="Empty Cart" className="w-full max-w-sm" />
          <p className="text-slate-500 text-3xl font-bold">Empty Cart</p>
        </div>
      )}
    </div>
  );
};

export default Cart;
