import { NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: Request) {
  try {
    const { amount, currency = "INR" } = await req.json();

    if (!amount) {
      return NextResponse.json({ error: "Amount is required" }, { status: 400 });
    }

    const razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID as string,
      key_secret: process.env.RAZORPAY_KEY_SECRET as string,
    });

    const options = {
      amount: parseInt(amount.toString(), 10), // amount in paisa
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return NextResponse.json({ order }, { status: 200 });
  } catch (error: any) {
    console.error("Error creating Razorpay order:", error);
    return NextResponse.json(
      { error: "Error creating Razorpay order" },
      { status: 500 }
    );
  }
}
