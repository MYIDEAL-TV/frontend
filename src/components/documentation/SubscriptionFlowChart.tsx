import React from 'react';

const SubscriptionFlowChart: React.FC = () => {
  return (
    <svg 
      viewBox="0 0 1200 1600" 
      className="w-full h-auto"
      style={{ minHeight: '800px' }}
    >
      <defs>
        {/* Gradients */}
        <linearGradient id="startGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="stepGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="100%" stopColor="#e2e8f0" />
        </linearGradient>
        <linearGradient id="decisionGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef3c7" />
          <stop offset="100%" stopColor="#fde68a" />
        </linearGradient>
        <linearGradient id="apiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ede9fe" />
          <stop offset="100%" stopColor="#ddd6fe" />
        </linearGradient>
        <linearGradient id="dbGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#dcfce7" />
          <stop offset="100%" stopColor="#bbf7d0" />
        </linearGradient>
        <linearGradient id="successGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="100%" stopColor="#16a34a" />
        </linearGradient>
        <linearGradient id="edgeFnGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f0abfc" />
          <stop offset="100%" stopColor="#e879f9" />
        </linearGradient>
        
        {/* Arrow marker */}
        <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
          <polygon points="0 0, 10 3.5, 0 7" fill="#475569" />
        </marker>
        
        {/* Shadow filter */}
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Background */}
      <rect width="1200" height="1600" fill="#ffffff" />

      {/* Title */}
      <text x="600" y="40" textAnchor="middle" fontSize="24" fontWeight="bold" fill="#0f172a">
        Subscription & Contract Flow
      </text>

      {/* SECTION 1: UI Steps */}
      <g transform="translate(0, 60)">
        {/* Section Label */}
        <rect x="20" y="0" width="140" height="28" rx="4" fill="#3b82f6" />
        <text x="90" y="19" textAnchor="middle" fontSize="12" fontWeight="600" fill="white">UI LAYER</text>
        
        {/* Start Node */}
        <rect x="450" y="50" width="300" height="50" rx="25" fill="url(#startGradient)" filter="url(#shadow)" />
        <text x="600" y="82" textAnchor="middle" fontSize="14" fontWeight="600" fill="white">User Starts New Subscription</text>

        {/* Arrow to Step 1 */}
        <line x1="600" y1="100" x2="600" y2="125" stroke="#475569" strokeWidth="2" markerEnd="url(#arrowhead)" />

        {/* Steps 1-5 */}
        {[
          { num: 1, label: 'Location Selection', sublabel: 'Saint-Barth, Saint-Martin, Sint-Maarten, Other' },
          { num: 2, label: 'Plan & Add-ons', sublabel: 'Location-specific plans, quantities' },
          { num: 3, label: 'Hardware & Fees', sublabel: 'Decoders, installation, equipment' },
          { num: 4, label: 'Demographics', sublabel: 'Subscriber, manager, financial, delivery' },
          { num: 5, label: 'Signature Options', sublabel: 'SEPA, Legal Package, Send Method' },
        ].map((step, i) => (
          <g key={i} transform={`translate(0, ${i * 65 + 130})`}>
            <rect x="400" y="0" width="400" height="55" rx="8" fill="url(#stepGradient)" stroke="#94a3b8" strokeWidth="1.5" filter="url(#shadow)" />
            <circle cx="430" cy="27" r="18" fill="#3b82f6" />
            <text x="430" y="33" textAnchor="middle" fontSize="14" fontWeight="bold" fill="white">{step.num}</text>
            <text x="600" y="23" textAnchor="middle" fontSize="13" fontWeight="600" fill="#1e293b">{step.label}</text>
            <text x="600" y="43" textAnchor="middle" fontSize="11" fill="#64748b">{step.sublabel}</text>
            {i < 4 && <line x1="600" y1="55" x2="600" y2="65" stroke="#475569" strokeWidth="2" markerEnd="url(#arrowhead)" />}
          </g>
        ))}

        {/* Arrow to Decision */}
        <line x1="600" y1="455" x2="600" y2="490" stroke="#475569" strokeWidth="2" markerEnd="url(#arrowhead)" />

        {/* Signature Method Decision Diamond */}
        <polygon points="600,500 700,550 600,600 500,550" fill="url(#decisionGradient)" stroke="#d97706" strokeWidth="2" filter="url(#shadow)" />
        <text x="600" y="545" textAnchor="middle" fontSize="12" fontWeight="600" fill="#92400e">Signature</text>
        <text x="600" y="560" textAnchor="middle" fontSize="12" fontWeight="600" fill="#92400e">Method?</text>
      </g>

      {/* SECTION 2: Route Paths */}
      <g transform="translate(0, 680)">
        {/* Three paths from decision */}
        
        {/* Left: Summary Only */}
        <line x1="500" y1="-20" x2="200" y2="30" stroke="#475569" strokeWidth="2" markerEnd="url(#arrowhead)" />
        <text x="320" y="0" fontSize="10" fill="#64748b">Summary Only</text>
        <rect x="100" y="40" width="200" height="45" rx="8" fill="url(#stepGradient)" stroke="#94a3b8" strokeWidth="1.5" filter="url(#shadow)" />
        <text x="200" y="58" textAnchor="middle" fontSize="11" fontWeight="500" fill="#1e293b">/contract-summary</text>
        <text x="200" y="75" textAnchor="middle" fontSize="10" fill="#64748b">No SignNow Integration</text>

        {/* Center: Secure Remote */}
        <line x1="600" y1="-20" x2="600" y2="30" stroke="#475569" strokeWidth="2" markerEnd="url(#arrowhead)" />
        <text x="620" y="0" fontSize="10" fill="#64748b">Secure Remote</text>
        <rect x="500" y="40" width="200" height="45" rx="8" fill="url(#apiGradient)" stroke="#7c3aed" strokeWidth="1.5" filter="url(#shadow)" />
        <text x="600" y="58" textAnchor="middle" fontSize="11" fontWeight="500" fill="#1e293b">/contract-secure</text>
        <text x="600" y="75" textAnchor="middle" fontSize="10" fill="#64748b">signnow-contract Edge Fn</text>

        {/* Right: Approver Flow */}
        <line x1="700" y1="-20" x2="1000" y2="30" stroke="#475569" strokeWidth="2" markerEnd="url(#arrowhead)" />
        <text x="880" y="0" fontSize="10" fill="#64748b">Approver Flow</text>
        <rect x="900" y="40" width="200" height="45" rx="8" fill="url(#edgeFnGradient)" stroke="#c026d3" strokeWidth="1.5" filter="url(#shadow)" />
        <text x="1000" y="58" textAnchor="middle" fontSize="11" fontWeight="500" fill="#1e293b">/contract-approver</text>
        <text x="1000" y="75" textAnchor="middle" fontSize="10" fill="#64748b">signnow-essentials Edge Fn</text>
      </g>

      {/* SECTION 3: Database Operations */}
      <g transform="translate(0, 790)">
        {/* Section Label */}
        <rect x="20" y="0" width="140" height="28" rx="4" fill="#22c55e" />
        <text x="90" y="19" textAnchor="middle" fontSize="12" fontWeight="600" fill="white">DATABASE</text>
        
        {/* Arrows converging to DB operations */}
        <path d="M200,5 L200,50 L600,50" stroke="#475569" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
        <path d="M600,5 L600,50" stroke="#475569" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />
        <path d="M1000,5 L1000,50 L600,50" stroke="#475569" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)" />

        {/* createInitialSubscription */}
        <rect x="400" y="60" width="400" height="40" rx="8" fill="url(#dbGradient)" stroke="#16a34a" strokeWidth="2" filter="url(#shadow)" />
        <text x="600" y="85" textAnchor="middle" fontSize="12" fontWeight="600" fill="#166534">createInitialSubscription()</text>
        
        <line x1="600" y1="100" x2="600" y2="115" stroke="#475569" strokeWidth="2" markerEnd="url(#arrowhead)" />

        {/* DB Operations Flow */}
        {[
          'Find/Create Subscriber',
          'Create Subscription Record',
          'Create Subscription Version + Addons',
          'Insert Managers & Financial Managers',
          'Set Delivery Address',
          'Create Contract Record (pending)',
        ].map((op, i) => (
          <g key={i} transform={`translate(0, ${i * 40 + 125})`}>
            <rect x="430" y="0" width="340" height="32" rx="6" fill="url(#dbGradient)" stroke="#86efac" strokeWidth="1" filter="url(#shadow)" />
            <text x="600" y="21" textAnchor="middle" fontSize="11" fill="#166534">{op}</text>
            {i < 5 && <line x1="600" y1="32" x2="600" y2="40" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrowhead)" />}
          </g>
        ))}
      </g>

      {/* SECTION 4: SignNow Integration */}
      <g transform="translate(0, 1140)">
        {/* Section Label */}
        <rect x="20" y="0" width="140" height="28" rx="4" fill="#8b5cf6" />
        <text x="90" y="19" textAnchor="middle" fontSize="12" fontWeight="600" fill="white">SIGNNOW API</text>

        {/* Flow Type Decision */}
        <line x1="600" y1="-10" x2="600" y2="25" stroke="#475569" strokeWidth="2" markerEnd="url(#arrowhead)" />
        <polygon points="600,35 680,75 600,115 520,75" fill="url(#decisionGradient)" stroke="#d97706" strokeWidth="2" filter="url(#shadow)" />
        <text x="600" y="70" textAnchor="middle" fontSize="11" fontWeight="600" fill="#92400e">Flow</text>
        <text x="600" y="85" textAnchor="middle" fontSize="11" fontWeight="600" fill="#92400e">Type?</text>

        {/* Summary Only - Left */}
        <line x1="520" y1="75" x2="150" y2="75" stroke="#475569" strokeWidth="2" />
        <line x1="150" y1="75" x2="150" y2="100" stroke="#475569" strokeWidth="2" markerEnd="url(#arrowhead)" />
        <text x="280" y="68" fontSize="10" fill="#64748b">Summary</text>
        <rect x="50" y="110" width="200" height="35" rx="6" fill="url(#successGradient)" filter="url(#shadow)" />
        <text x="150" y="133" textAnchor="middle" fontSize="11" fontWeight="500" fill="white">Return Success (No API)</text>

        {/* Direct Signer - Center */}
        <line x1="600" y1="115" x2="600" y2="145" stroke="#475569" strokeWidth="2" markerEnd="url(#arrowhead)" />
        <text x="615" y="135" fontSize="10" fill="#64748b">Direct</text>
        
        {/* Direct Signer API Steps */}
        <rect x="400" y="155" width="400" height="30" rx="6" fill="url(#apiGradient)" stroke="#8b5cf6" strokeWidth="1" filter="url(#shadow)" />
        <text x="600" y="175" textAnchor="middle" fontSize="10" fill="#5b21b6">OAuth Token → Get Location Template</text>
        
        <line x1="600" y1="185" x2="600" y2="195" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
        
        <rect x="400" y="200" width="400" height="30" rx="6" fill="url(#apiGradient)" stroke="#8b5cf6" strokeWidth="1" filter="url(#shadow)" />
        <text x="600" y="220" textAnchor="middle" fontSize="10" fill="#5b21b6">Prefill Smart Fields → Create Document Copy</text>
        
        <line x1="600" y1="230" x2="600" y2="240" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
        
        <rect x="400" y="245" width="400" height="30" rx="6" fill="url(#apiGradient)" stroke="#8b5cf6" strokeWidth="1" filter="url(#shadow)" />
        <text x="600" y="265" textAnchor="middle" fontSize="10" fill="#5b21b6">[Optional] Merge Legal Package + SEPA Mandate</text>
        
        <line x1="600" y1="275" x2="600" y2="285" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
        
        <rect x="400" y="290" width="400" height="30" rx="6" fill="url(#apiGradient)" stroke="#8b5cf6" strokeWidth="1" filter="url(#shadow)" />
        <text x="600" y="310" textAnchor="middle" fontSize="10" fill="#5b21b6">Assign Location Brand → Generate Signing Link</text>

        {/* Approver Flow - Right */}
        <line x1="680" y1="75" x2="1000" y2="75" stroke="#475569" strokeWidth="2" />
        <line x1="1000" y1="75" x2="1000" y2="145" stroke="#475569" strokeWidth="2" markerEnd="url(#arrowhead)" />
        <text x="880" y="68" fontSize="10" fill="#64748b">Approver</text>
        
        {/* Approver API Steps */}
        <rect x="850" y="155" width="300" height="30" rx="6" fill="url(#edgeFnGradient)" stroke="#c026d3" strokeWidth="1" filter="url(#shadow)" />
        <text x="1000" y="175" textAnchor="middle" fontSize="10" fill="#86198f">Get Approver Template (w/ or w/o T&C)</text>
        
        <line x1="1000" y1="185" x2="1000" y2="195" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
        
        <rect x="850" y="200" width="300" height="30" rx="6" fill="url(#edgeFnGradient)" stroke="#c026d3" strokeWidth="1" filter="url(#shadow)" />
        <text x="1000" y="220" textAnchor="middle" fontSize="10" fill="#86198f">Prefill → Create Copy → [SEPA]</text>
        
        <line x1="1000" y1="230" x2="1000" y2="240" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
        
        <rect x="850" y="245" width="300" height="30" rx="6" fill="url(#edgeFnGradient)" stroke="#c026d3" strokeWidth="1" filter="url(#shadow)" />
        <text x="1000" y="265" textAnchor="middle" fontSize="10" fill="#86198f">Setup 2-Step Routing (Approver → Signer)</text>
        
        <line x1="1000" y1="275" x2="1000" y2="285" stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrowhead)" />
        
        <rect x="850" y="290" width="300" height="30" rx="6" fill="url(#edgeFnGradient)" stroke="#c026d3" strokeWidth="1" filter="url(#shadow)" />
        <text x="1000" y="310" textAnchor="middle" fontSize="10" fill="#86198f">Create Embedded Invite for Approver</text>

        {/* Converge to Success */}
        <path d="M150,145 L150,370 L600,370" stroke="#475569" strokeWidth="2" fill="none" />
        <path d="M600,320 L600,370" stroke="#475569" strokeWidth="2" fill="none" />
        <path d="M1000,320 L1000,370 L600,370" stroke="#475569" strokeWidth="2" fill="none" />
        <line x1="600" y1="370" x2="600" y2="390" stroke="#475569" strokeWidth="2" markerEnd="url(#arrowhead)" />

        {/* Final Success */}
        <rect x="450" y="400" width="300" height="50" rx="25" fill="url(#successGradient)" filter="url(#shadow)" />
        <text x="600" y="420" textAnchor="middle" fontSize="12" fontWeight="600" fill="white">Update Contract Record</text>
        <text x="600" y="438" textAnchor="middle" fontSize="11" fill="rgba(255,255,255,0.9)">Navigate to Success Page</text>
      </g>

      {/* Legend */}
      <g transform="translate(20, 1550)">
        <text x="0" y="0" fontSize="12" fontWeight="600" fill="#0f172a">Legend:</text>
        <rect x="80" y="-12" width="20" height="16" rx="3" fill="url(#startGradient)" />
        <text x="105" y="0" fontSize="10" fill="#64748b">Start/End</text>
        <rect x="180" y="-12" width="20" height="16" rx="3" fill="url(#stepGradient)" stroke="#94a3b8" />
        <text x="205" y="0" fontSize="10" fill="#64748b">UI Step</text>
        <polygon points="290,-4 300,4 290,12 280,4" fill="url(#decisionGradient)" stroke="#d97706" />
        <text x="310" y="0" fontSize="10" fill="#64748b">Decision</text>
        <rect x="380" y="-12" width="20" height="16" rx="3" fill="url(#dbGradient)" stroke="#16a34a" />
        <text x="405" y="0" fontSize="10" fill="#64748b">Database</text>
        <rect x="480" y="-12" width="20" height="16" rx="3" fill="url(#apiGradient)" stroke="#8b5cf6" />
        <text x="505" y="0" fontSize="10" fill="#64748b">Direct API</text>
        <rect x="580" y="-12" width="20" height="16" rx="3" fill="url(#edgeFnGradient)" stroke="#c026d3" />
        <text x="605" y="0" fontSize="10" fill="#64748b">Approver API</text>
      </g>
    </svg>
  );
};

export default SubscriptionFlowChart;
