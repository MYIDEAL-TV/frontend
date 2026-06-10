import { useEffect } from "react";

const ContractExit = () => {
  useEffect(() => {
    // Send the same message to trigger the 'showDownloadOption' UI in the parent
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: "CONTRACT_SIGNED" }, "*");
    } else {
      window.location.href = "/";
    }
  }, []);

  return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
      <p style={{ color: '#666', fontFamily: 'sans-serif' }}>Exiting review...</p>
    </div>
  );
};

export default ContractExit;