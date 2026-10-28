import { FrankieChatPage } from "@frankieai/react";
import { getUserToken, productKey } from "../frankie";

export function ChatPage() {
  if (!productKey) {
    return <p className="empty">Set <code>VITE_FRANKIE_KEY</code> to use the full-page assistant.</p>;
  }
  return <FrankieChatPage publishableKey={productKey} getUserToken={getUserToken} />;
}
