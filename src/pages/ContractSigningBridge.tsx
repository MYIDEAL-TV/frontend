import { useEffect } from "react";

const ContractSigningBridge = () => {
  useEffect(() => {
    // 1. Immediately stop the browser from loading any more SignNow assets
    window.stop();

    console.log("🌉 Bridge reached. Signaling parent...");

    // 2. Message the parent
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "CONTRACT_SIGNED" }, "*");
    } 
    
    // 3. If for some reason it's not in an iframe, redirect home
    else {
      window.location.href = "/";
    }
  }, []);

  // Return a completely empty div to ensure no extra scripts run
  return <div style={{ background: 'white', height: '100vh' }} />;
};

export default ContractSigningBridge;