// ── TYPES ─────────────────────────────────────────────────────────────────────

export interface LeaseNote {
  id: number;
  date: string;
  author: string;
  text: string;
}

export interface LeaseDocument {
  id: number;
  name: string;
  fileType: 'PDF' | 'Excel' | 'Word' | 'CAD' | 'Image' | 'Other';
  size: string;
  date: string;
}

// ── PORTFOLIO TRACKER ────────────────────────────────────────────────────────

export const leases = [
  { id: 1,  tenant: 'Deloitte LLP',       property: 'One Peachtree Center',     address: '303 Peachtree St NE, Atlanta, GA',              sqft: 45000,  rentPSF: 38.50, totalRent: 1732500,  leaseStart: '2022-01-15', leaseEnd: '2027-12-31', type: 'Office',     clientLead: 'Travis Hilty', status: 'Active Initiative', strategy: 'Maintain / Renew',    stage: '4. Proposal/LOI',         market: 'Atlanta',       submarket: 'CBD',         floors: '22–24',     broker: 'CBRE',    lat: 33.7573, lng: -84.3862 },
  { id: 2,  tenant: 'McKinsey & Co.',      property: 'Buckhead Tower',           address: '3280 Peachtree Rd, Atlanta, GA',                sqft: 28000,  rentPSF: 44.00, totalRent: 1232000,  leaseStart: '2023-06-01', leaseEnd: '2028-05-31', type: 'Office',     clientLead: 'Keith Swartzentruber',  status: 'Active Disposition', strategy: 'New Project',           stage: '2. Market Survey',        market: 'Atlanta',       submarket: 'Buckhead',    floors: '18',        broker: 'JLL',     lat: 33.8476, lng: -84.3632 },
  { id: 3,  tenant: 'Amazon Web Services', property: 'Terminus 100',             address: '3280 Peachtree Rd, Atlanta, GA',                sqft: 62000,  rentPSF: 42.00, totalRent: 2604000,  leaseStart: '2021-09-01', leaseEnd: '2026-08-31', type: 'Office',     clientLead: 'Matt Epperson',   status: 'Active Initiative', strategy: 'Restructure / Renew', stage: '3. Tour',                 market: 'Atlanta',       submarket: 'Buckhead',    floors: '10–12',     broker: 'Cushman', lat: 33.8490, lng: -84.3640 },
  { id: 4,  tenant: 'PwC Advisory',        property: '1180 Peachtree',           address: '1180 Peachtree St, Atlanta, GA',                sqft: 31500,  rentPSF: 46.50, totalRent: 1464750,  leaseStart: '2020-03-01', leaseEnd: '2025-02-28', type: 'Office',     clientLead: 'Travis Hilty', status: 'Active Initiative', strategy: 'Relocate',             stage: '5. Lease Negotiations',   market: 'Atlanta',       submarket: 'Midtown',     floors: '25–26',     broker: 'CBRE',    lat: 33.7854, lng: -84.3832 },
  { id: 5,  tenant: 'Bank of America',     property: 'Promenade',                address: '1230 Peachtree St, Atlanta, GA',                sqft: 85000,  rentPSF: 37.00, totalRent: 3145000,  leaseStart: '2019-01-01', leaseEnd: '2024-12-31', type: 'Office',     clientLead: 'Alisha Shields', status: 'Active Disposition', strategy: 'Sublease / Buyout',   stage: '3. Marketing Package',    market: 'Atlanta',       submarket: 'Midtown',     floors: '4–9',       broker: 'JLL',     lat: 33.7837, lng: -84.3830 },
  { id: 6,  tenant: 'Salesforce Inc.',     property: 'Three Alliance Center',    address: '3550 Lenox Rd NE, Atlanta, GA',                 sqft: 22000,  rentPSF: 48.00, totalRent: 1056000,  leaseStart: '2024-01-01', leaseEnd: '2029-12-31', type: 'Office',     clientLead: 'Keith Swartzentruber',  status: 'Active Disposition', strategy: 'New Project',           stage: '1. Plan and Program',     market: 'Atlanta',       submarket: 'Buckhead',    floors: '14',        broker: 'Newmark', lat: 33.8492, lng: -84.3628 },
  { id: 7,  tenant: 'NCR Corporation',     property: 'NCR Global HQ',            address: '864 Spring St NW, Atlanta, GA',                 sqft: 140000, rentPSF: 33.50, totalRent: 4690000,  leaseStart: '2018-07-01', leaseEnd: '2028-06-30', type: 'Office',     clientLead: 'Matt Epperson',   status: 'Active Initiative', strategy: 'Project Management',  stage: '7. Construction',         market: 'Atlanta',       submarket: 'Midtown',     floors: 'Full Bldg', broker: 'HQ',    lat: 33.7804, lng: -84.3942 },
  { id: 8,  tenant: 'Cox Communications',  property: 'Perimeter Center',         address: '6205 Peachtree Dunwoody, Sandy Springs, GA',    sqft: 72000,  rentPSF: 29.00, totalRent: 2088000,  leaseStart: '2020-11-01', leaseEnd: '2025-10-31', type: 'Office',     clientLead: 'Alisha Shields', status: 'Active Initiative', strategy: 'Restructure / Renew', stage: '2. Market Survey',        market: 'Atlanta',       submarket: 'Perimeter',   floors: '3–6',       broker: 'CBRE',    lat: 33.9204, lng: -84.3515 },
  { id: 9,  tenant: 'EY (Ernst & Young)',  property: '55 Second Street',         address: '55 Second St, San Francisco, CA',               sqft: 38000,  rentPSF: 72.00, totalRent: 2736000,  leaseStart: '2022-04-01', leaseEnd: '2027-03-31', type: 'Office',     clientLead: 'Travis Hilty', status: 'Active Disposition', strategy: 'Maintain / Renew',    stage: '1. Plan and Program',     market: 'San Francisco', submarket: 'SoMa',        floors: '8–9',       broker: 'JLL',     lat: 37.7875, lng: -122.3987 },
  { id: 10, tenant: 'Google LLC',          property: '345 Spear St',             address: '345 Spear St, San Francisco, CA',               sqft: 220000, rentPSF: 85.00, totalRent: 18700000, leaseStart: '2023-01-01', leaseEnd: '2033-12-31', type: 'Office',     clientLead: 'Keith Swartzentruber',  status: 'Inactive',          strategy: 'Maintain / Renew',    stage: '1. Plan and Program',     market: 'San Francisco', submarket: 'Mission Bay', floors: '1–12',      broker: 'Cushman', lat: 37.7900, lng: -122.3893 },
  { id: 11, tenant: 'Accenture',           property: '500 W Madison',            address: '500 W Madison St, Chicago, IL',                 sqft: 55000,  rentPSF: 45.00, totalRent: 2475000,  leaseStart: '2021-01-01', leaseEnd: '2026-12-31', type: 'Office',     clientLead: 'Alisha Shields', status: 'Active Initiative', strategy: 'Project Management',  stage: '5. Design Development',   market: 'Chicago',       submarket: 'West Loop',   floors: '29–31',     broker: 'CBRE',    lat: 41.8823, lng: -87.6410 },
  { id: 12, tenant: 'United Airlines',     property: 'Willis Tower',             address: '233 S Wacker Dr, Chicago, IL',                  sqft: 95000,  rentPSF: 41.00, totalRent: 3895000,  leaseStart: '2018-01-01', leaseEnd: '2025-12-31', type: 'Office',     clientLead: 'Travis Hilty', status: 'Active Initiative', strategy: 'Restructure / Renew', stage: '5. Lease Negotiations',   market: 'Chicago',       submarket: 'CBD',         floors: '42–46',     broker: 'JLL',     lat: 41.8789, lng: -87.6359 },
  { id: 13, tenant: 'Slalom Consulting',   property: 'Midtown Union',            address: '1400 W Peachtree St, Atlanta, GA',              sqft: 18000,  rentPSF: 50.00, totalRent: 900000,   leaseStart: '2024-06-01', leaseEnd: '2027-05-31', type: 'Office',     clientLead: 'Matt Epperson',   status: 'Active Disposition', strategy: 'Project Management',  stage: '3. Test Fit',             market: 'Atlanta',       submarket: 'Midtown',     floors: '32',        broker: 'Newmark', lat: 33.7895, lng: -84.3908 },
  { id: 14, tenant: 'Regions Bank',        property: 'Regions Center',           address: '400 20th St N, Birmingham, AL',                 sqft: 48000,  rentPSF: 28.00, totalRent: 1344000,  leaseStart: '2020-09-01', leaseEnd: '2030-08-31', type: 'Healthcare', clientLead: 'Keith Swartzentruber',  status: 'Active Disposition', strategy: 'Project Management',  stage: '2. Architect Procurement',market: 'Birmingham',    submarket: 'CBD',         floors: '1–4',       broker: 'Cushman', lat: 33.5207, lng: -86.8109 },
  { id: 15, tenant: 'Honeywell Intl.',     property: 'Woodland Falls Corp Park', address: '101 Columbia Rd, Morris Plains, NJ',            sqft: 110000, rentPSF: 32.00, totalRent: 3520000,  leaseStart: '2017-01-01', leaseEnd: '2024-12-31', type: 'Industrial', clientLead: 'Alisha Shields', status: 'Archive',           strategy: 'Close',               stage: '5. Landlord Walkthrough', market: 'New Jersey',    submarket: 'Morris County', floors: '1–3',    broker: 'CBRE',    lat: 40.8176, lng: -74.4810 },
];

// ── SEED NOTES ────────────────────────────────────────────────────────────────

export const initialLeaseNotes: Record<number, LeaseNote[]> = {
  1: [
    { id: 1, date: '2026-04-02', author: 'Travis', text: 'Met with Deloitte facilities team. Confirmed interest in renewal. Awaiting final approval from CFO before executing LOI.' },
    { id: 2, date: '2026-03-15', author: 'Travis', text: 'Proposal submitted at $41.00 PSF for 5-year renewal. Deloitte reviewing internally — response expected within 2 weeks.' },
    { id: 3, date: '2026-02-28', author: 'Travis', text: 'Initial market survey delivered. Buckhead and Midtown alternatives presented as leverage.' },
  ],
  3: [
    { id: 1, date: '2026-04-05', author: 'Matt', text: 'AWS confirmed expansion interest alongside restructure. Tours scheduled for April 12–14 across 3 Buckhead properties.' },
    { id: 2, date: '2026-03-20', author: 'Matt', text: 'Restructure analysis completed. AWS evaluating 20% space reduction as part of new hybrid model.' },
  ],
  4: [
    { id: 1, date: '2026-04-08', author: 'Travis', text: 'LOI signed on 1180 Peachtree relocation target. Moving to lease negotiation stage. Target commencement Q3 2025.' },
    { id: 2, date: '2026-03-30', author: 'Travis', text: 'PwC approved budget for relocation. Tenant rep agreement executed with CBRE.' },
    { id: 3, date: '2026-03-10', author: 'Travis', text: 'Three alternative locations toured. 1180 Peachtree ranked #1 by PwC facilities team based on MARTA access and floor plate.' },
  ],
  7: [
    { id: 1, date: '2026-04-03', author: 'Matt', text: 'Construction on track for Q3 2026 substantial completion. Punch list review with general contractor scheduled for August.' },
    { id: 2, date: '2026-03-10', author: 'Matt', text: 'NCR approved 15% scope expansion for lobby and café. Change order #4 executed — adds $420K to project budget.' },
  ],
  8: [
    { id: 1, date: '2026-04-01', author: 'Alisha', text: 'Cox hybrid work policy finalized at 3 days/week in-office. Expect 15–20% footprint reduction in renewal negotiations.' },
    { id: 2, date: '2026-03-18', author: 'Alisha', text: 'Market survey initiated. Perimeter submarket alternatives compiled — Cumberland and Dunwoody emerging as contenders.' },
  ],
  11: [
    { id: 1, date: '2026-04-06', author: 'Alisha', text: 'Accenture Chicago PM project on track. Design development approved by client. GC procurement underway.' },
    { id: 2, date: '2026-03-22', author: 'Alisha', text: 'Three spaces toured at 300 W Adams, 225 W Wacker, and 123 N Wacker. LOI submitted and accepted on 300 W Adams.' },
  ],
  12: [
    { id: 1, date: '2026-04-07', author: 'Travis', text: 'UA leadership approved in-place renewal scenario. Counterproposal submitted at $43 PSF. Decision expected May 2026.' },
    { id: 2, date: '2026-03-25', author: 'Travis', text: 'Willis Tower landlord rejected initial $41 PSF proposal. New counterproposal with enhanced TI package prepared.' },
    { id: 3, date: '2026-03-05', author: 'Travis', text: 'UA confirmed strong preference to stay at Willis Tower. Preparing in-place renewal vs relocation analysis.' },
  ],
  5: [
    { id: 1, date: '2026-03-28', author: 'Alisha', text: 'Marketing package circulated to 6 sublease prospects. Two tours scheduled — Apollo Global and TechBridge.' },
  ],
  2: [
    { id: 1, date: '2026-04-04', author: 'Keith', text: 'McKinsey new project planning kick-off completed. Space programming under review — 3-year headcount projection at 35.' },
  ],
  13: [
    { id: 1, date: '2026-04-01', author: 'Matt', text: 'Test fit approved by Slalom stakeholders. Moving to schematic design. Architect engaged — completion by May 15.' },
  ],
  14: [
    { id: 1, date: '2026-03-20', author: 'Keith', text: 'Architect procurement RFP issued to 4 firms. Responses due April 18. Selection expected by May 1, 2026.' },
  ],
};

// ── SEED DOCUMENTS ────────────────────────────────────────────────────────────

export const initialLeaseDocuments: Record<number, LeaseDocument[]> = {
  1: [
    { id: 1, name: 'Deloitte_Lease_Abstract.pdf',       fileType: 'PDF',   size: '2.3 MB',  date: '2022-01-15' },
    { id: 2, name: 'Renewal_Analysis_Q1_2026.xlsx',      fileType: 'Excel', size: '450 KB',  date: '2026-01-10' },
    { id: 3, name: 'Market_Survey_Midtown_2026.pdf',     fileType: 'PDF',   size: '5.1 MB',  date: '2026-02-28' },
  ],
  4: [
    { id: 1, name: 'PwC_Lease_Abstract.pdf',            fileType: 'PDF',   size: '1.8 MB',  date: '2020-03-01' },
    { id: 2, name: 'Relocation_Study_2026.pdf',          fileType: 'PDF',   size: '8.4 MB',  date: '2026-03-01' },
    { id: 3, name: 'LOI_1180_Peachtree_signed.pdf',      fileType: 'PDF',   size: '340 KB',  date: '2026-04-08' },
  ],
  7: [
    { id: 1, name: 'NCR_HQ_Lease.pdf',                  fileType: 'PDF',   size: '3.2 MB',  date: '2018-07-01' },
    { id: 2, name: 'PM_Schedule_NCR_Q2_2026.xlsx',       fileType: 'Excel', size: '720 KB',  date: '2026-04-01' },
    { id: 3, name: 'Construction_Drawings_Rev3.dwg',     fileType: 'CAD',   size: '42 MB',   date: '2026-03-15' },
    { id: 4, name: 'Change_Order_4.pdf',                 fileType: 'PDF',   size: '210 KB',  date: '2026-03-10' },
  ],
  11: [
    { id: 1, name: 'Accenture_Lease_Abstract.pdf',      fileType: 'PDF',   size: '2.1 MB',  date: '2021-01-01' },
    { id: 2, name: 'Chicago_Relocation_TestFit.dwg',     fileType: 'CAD',   size: '18 MB',   date: '2026-03-22' },
    { id: 3, name: 'Design_Development_Package.pdf',     fileType: 'PDF',   size: '12.5 MB', date: '2026-04-06' },
  ],
  12: [
    { id: 1, name: 'Willis_Tower_Lease_Abstract.pdf',   fileType: 'PDF',   size: '2.8 MB',  date: '2018-01-01' },
    { id: 2, name: 'UA_Renewal_Analysis_2025.xlsx',      fileType: 'Excel', size: '580 KB',  date: '2026-02-15' },
  ],
  5: [
    { id: 1, name: 'BofA_Lease_Abstract.pdf',           fileType: 'PDF',   size: '3.1 MB',  date: '2019-01-01' },
    { id: 2, name: 'Sublease_Marketing_Package.pdf',     fileType: 'PDF',   size: '9.2 MB',  date: '2026-03-28' },
  ],
  13: [
    { id: 1, name: 'Slalom_TestFit_Floor32.dwg',        fileType: 'CAD',   size: '8.4 MB',  date: '2026-04-01' },
  ],
  14: [
    { id: 1, name: 'Regions_Lease_Abstract.pdf',        fileType: 'PDF',   size: '1.6 MB',  date: '2020-09-01' },
    { id: 2, name: 'Architect_RFP_April2026.docx',       fileType: 'Word',  size: '320 KB',  date: '2026-03-20' },
  ],
};

// ── LEGACY INITIATIVES (kept for backward compat) ────────────────────────────

export const initiatives = [
  { id: 1, name: 'Deloitte Renewal Negotiation',   property: 'One Peachtree Center', status: 'In Progress', priority: 'High',     assignee: 'Travis',  dueDate: '2027-06-30', stage: 'Letter of Intent',   progress: 45, description: 'Negotiate 5-year renewal with Deloitte. Current rent $38.50 PSF, targeting $41.00 PSF.' },
  { id: 2, name: 'PwC Lease Extension Analysis',   property: '1180 Peachtree',       status: 'In Progress', priority: 'Critical', assignee: 'Travis',  dueDate: '2024-09-30', stage: 'Market Analysis',    progress: 70, description: 'PwC lease expiring Q1 2025. Evaluating relocation options vs extension.' },
  { id: 3, name: 'Bank of America Disposition',    property: 'Promenade',             status: 'Pending',     priority: 'High',     assignee: 'Alisha',  dueDate: '2024-11-30', stage: 'RFP Issued',         progress: 25, description: 'BofA exploring 30% space reduction. Disposition of 25,000 SF underway.' },
  { id: 4, name: 'Cox Perimeter Renewal',          property: 'Perimeter Center',      status: 'In Progress', priority: 'Medium',   assignee: 'Alisha',  dueDate: '2025-04-30', stage: 'Lease Negotiations', progress: 60, description: 'Cox evaluating hybrid work policy. Likely 20% footprint reduction.' },
  { id: 5, name: 'Honeywell NJ Wind-Down',         property: 'Woodland Falls Corp',   status: 'Complete',    priority: 'Low',      assignee: 'Alisha',  dueDate: '2024-12-31', stage: 'Executed',           progress: 100, description: 'Lease expired. Sublease campaign concluded. Space returned to landlord.' },
  { id: 6, name: 'Salesforce Expansion Option',    property: 'Three Alliance Center', status: 'Pending',     priority: 'Medium',   assignee: 'Keith',   dueDate: '2025-06-30', stage: 'Market Survey',      progress: 15, description: 'Salesforce evaluating expansion of additional 8,000 SF on same floor.' },
  { id: 7, name: 'United Airlines Chicago',        property: 'Willis Tower',          status: 'In Progress', priority: 'Critical', assignee: 'Travis',  dueDate: '2025-03-31', stage: 'RFP Responses',      progress: 55, description: 'UA evaluating full relocation vs in-place renewal at Willis Tower.' },
  { id: 8, name: 'Google SF Lease Audit',          property: '345 Spear St',          status: 'Complete',    priority: 'Low',      assignee: 'Keith',   dueDate: '2024-03-31', stage: 'Executed',           progress: 100, description: 'Annual lease audit completed. Operating expense reconciliation finalized.' },
];


// ── WORKPLACE STRATEGY ────────────────────────────────────────────────────────

export const spaceProgram = [
  { id: 1, department: 'Executive Leadership',  headcount: 12,  ratio: 200, privatePct: 80, collaborationPct: 15, amenitiesPct: 5,   totalSqft: 2400,  type: 'Private Office Heavy' },
  { id: 2, department: 'Legal & Compliance',    headcount: 28,  ratio: 175, privatePct: 65, collaborationPct: 20, amenitiesPct: 15,  totalSqft: 4900,  type: 'Hybrid' },
  { id: 3, department: 'Finance & Accounting',  headcount: 45,  ratio: 140, privatePct: 30, collaborationPct: 40, amenitiesPct: 30,  totalSqft: 6300,  type: 'Open Plan' },
  { id: 4, department: 'Human Resources',       headcount: 22,  ratio: 150, privatePct: 35, collaborationPct: 35, amenitiesPct: 30,  totalSqft: 3300,  type: 'Hybrid' },
  { id: 5, department: 'Technology & IT',       headcount: 85,  ratio: 120, privatePct: 10, collaborationPct: 55, amenitiesPct: 35,  totalSqft: 10200, type: 'Open Plan' },
  { id: 6, department: 'Sales & Marketing',     headcount: 60,  ratio: 110, privatePct: 5,  collaborationPct: 60, amenitiesPct: 35,  totalSqft: 6600,  type: 'Activity-Based' },
  { id: 7, department: 'Operations',            headcount: 38,  ratio: 130, privatePct: 15, collaborationPct: 50, amenitiesPct: 35,  totalSqft: 4940,  type: 'Hybrid' },
  { id: 8, department: 'Reception & Common',    headcount: 0,   ratio: 0,   privatePct: 0,  collaborationPct: 0,  amenitiesPct: 100, totalSqft: 3500,  type: 'Shared/Common' },
  { id: 9, department: 'Conference & Training', headcount: 0,   ratio: 0,   privatePct: 0,  collaborationPct: 100,amenitiesPct: 0,   totalSqft: 4200,  type: 'Collaboration' },
  { id: 10,department: 'IT Lab & Server Room',  headcount: 0,   ratio: 0,   privatePct: 0,  collaborationPct: 0,  amenitiesPct: 100, totalSqft: 800,   type: 'Utility' },
];

export const questionnaire = {
  sections: [
    {
      id: 1, title: 'Workforce & Headcount', complete: true, responses: [
        { q: 'Current total headcount',       a: '290 employees' },
        { q: 'Projected headcount in 3 years',a: '340–380 employees' },
        { q: 'Remote / hybrid work split',    a: '60% in-office, 40% remote' },
        { q: 'Peak occupancy day',            a: 'Tuesday & Wednesday' },
        { q: 'Average daily utilization',     a: '58%' },
      ]
    },
    {
      id: 2, title: 'Space Requirements', complete: true, responses: [
        { q: 'Private offices needed',        a: '32 offices' },
        { q: 'Open workstations needed',      a: '180 stations' },
        { q: 'Collaboration rooms needed',    a: '22 rooms (4–12 person)' },
        { q: 'Phone rooms / focus pods',      a: '20 pods' },
        { q: 'Storage & filing requirements', a: 'Minimal (digital-first)' },
      ]
    },
    {
      id: 3, title: 'Amenities & Services', complete: false, responses: [
        { q: 'Café / food service required',  a: 'Yes — full-service café' },
        { q: 'Fitness center',                a: 'Preferred but not required' },
        { q: "Mother's room",                 a: 'Minimum 2 required' },
        { q: 'Mail / shipping room',          a: 'Yes' },
      ]
    },
    {
      id: 4, title: 'Technology & Infrastructure', complete: false, responses: [
        { q: 'AV requirements',               a: 'Video-enabled in all rooms' },
        { q: 'Server room / data closet',     a: '600–800 SF dedicated space' },
        { q: 'Raised floor needed',           a: 'No' },
        { q: 'EV charging stations',          a: '20+ stalls requested' },
      ]
    },
    {
      id: 5, title: 'Location & Access', complete: false, responses: [
        { q: 'Preferred submarket',           a: 'Midtown or Buckhead Atlanta' },
        { q: 'Transit access required',       a: 'MARTA access preferred' },
        { q: 'Parking requirements',          a: '1 per 1,000 SF minimum' },
        { q: 'Move-in date target',           a: 'Q3 2026' },
      ]
    },
  ]
};

// ── MARKET INTELLIGENCE ───────────────────────────────────────────────────────

export const leaseComps = [
  { id: 1,  tenant: 'Microsoft Corp',    property: 'Atlantic Yards Tower A',     address: '271 17th St NW, Atlanta, GA',          sqft: 48000, rentPSF: 47.50, leaseDate: '2024-11-15', leaseType: 'New',      term: 10, floors: '20–21', submarket: 'Midtown',    concessions: 'TI $120 PSF, 12 mo free rent', landlord: 'Hines' },
  { id: 2,  tenant: 'Visa Inc.',         property: 'Regent Atlanta',             address: '1075 Peachtree St NE, Atlanta, GA',    sqft: 32000, rentPSF: 51.00, leaseDate: '2024-10-01', leaseType: 'Renewal',  term: 7,  floors: '24',    submarket: 'Midtown',    concessions: 'TI $85 PSF, 6 mo free rent',   landlord: 'Cousins' },
  { id: 3,  tenant: 'Insight Global',    property: 'Buckhead Village',           address: '3340 Peachtree Rd NE, Atlanta, GA',    sqft: 22500, rentPSF: 45.00, leaseDate: '2024-09-15', leaseType: 'Expansion',term: 5,  floors: '12',    submarket: 'Buckhead',   concessions: 'TI $95 PSF',                    landlord: 'Jamestown' },
  { id: 4,  tenant: 'DoorDash Inc.',     property: '1105 West Peachtree',        address: '1105 W Peachtree St, Atlanta, GA',     sqft: 27000, rentPSF: 46.50, leaseDate: '2024-08-01', leaseType: 'New',      term: 8,  floors: '15–16', submarket: 'Midtown',    concessions: 'TI $110 PSF, 9 mo free rent',  landlord: 'Portman' },
  { id: 5,  tenant: 'Anthem Blue Cross', property: '55 Ivan Allen Blvd',         address: '55 Ivan Allen Jr Blvd, Atlanta, GA',   sqft: 67000, rentPSF: 40.00, leaseDate: '2024-07-15', leaseType: 'Renewal',  term: 10, floors: '8–11',  submarket: 'CBD',        concessions: 'TI $70 PSF, 6 mo free rent',   landlord: 'Lincoln Property' },
  { id: 6,  tenant: 'Norfolk Southern',  property: 'Coda',                       address: '756 W Peachtree St NW, Atlanta, GA',   sqft: 115000,rentPSF: 52.00, leaseDate: '2024-06-01', leaseType: 'New',      term: 15, floors: '10–16', submarket: 'Midtown',    concessions: 'TI $130 PSF, 18 mo free rent', landlord: 'Cousins' },
  { id: 7,  tenant: 'Optum Health',      property: 'Riverwood 200',              address: '200 Riverwood Pkwy, Atlanta, GA',       sqft: 41000, rentPSF: 32.50, leaseDate: '2024-05-15', leaseType: 'Renewal',  term: 7,  floors: '2–3',   submarket: 'Perimeter',  concessions: 'TI $60 PSF',                    landlord: 'Stream Realty' },
  { id: 8,  tenant: 'PTC Inc.',          property: 'Ponce City Market East Wing',address: '675 Ponce de Leon Ave NE, Atlanta, GA',sqft: 19500, rentPSF: 54.00, leaseDate: '2024-04-01', leaseType: 'New',      term: 6,  floors: '4',     submarket: 'Midtown',    concessions: 'TI $100 PSF, 3 mo free rent',  landlord: 'Jamestown' },
  { id: 9,  tenant: 'Citizens Bank',     property: '2300 Windy Ridge',           address: '2300 Windy Ridge Pkwy, Smyrna, GA',    sqft: 35000, rentPSF: 28.00, leaseDate: '2024-03-15', leaseType: 'Renewal',  term: 5,  floors: '5–6',   submarket: 'Cumberland', concessions: 'TI $45 PSF',                    landlord: 'Highwoods' },
  { id: 10, tenant: 'Cardlytics',        property: 'Colony Square Tower II',     address: '1200 W Peachtree St, Atlanta, GA',     sqft: 38500, rentPSF: 49.50, leaseDate: '2024-02-01', leaseType: 'Expansion',term: 8,  floors: '27–28', submarket: 'Midtown',    concessions: 'TI $115 PSF, 8 mo free rent',  landlord: 'North American Properties' },
  { id: 11, tenant: 'NCR Atleos',        property: 'Atlantic Station Central Park',address:'1601 W Peachtree St, Atlanta, GA',    sqft: 52000, rentPSF: 43.00, leaseDate: '2024-01-15', leaseType: 'New',      term: 10, floors: '6–8',   submarket: 'Midtown',    concessions: 'TI $105 PSF, 12 mo free rent', landlord: 'Carter' },
  { id: 12, tenant: 'KPMG LLP',          property: 'Palisades West',             address: '2100 E Ponce de Leon, Decatur, GA',    sqft: 24000, rentPSF: 34.00, leaseDate: '2023-12-01', leaseType: 'Renewal',  term: 5,  floors: '4',     submarket: 'Decatur',    concessions: 'TI $55 PSF',                    landlord: 'Selig' },
];

export const mapProperties = [
  { id: 1,  name: 'One Peachtree Center',   lat: 33.7573, lng: -84.3862, type: 'Office', status: 'Active',    sqft: 45000,  tenant: 'Deloitte LLP',         rentPSF: 38.50 },
  { id: 2,  name: 'Buckhead Tower',         lat: 33.8476, lng: -84.3632, type: 'Office', status: 'Active',    sqft: 28000,  tenant: 'McKinsey & Co.',        rentPSF: 44.00 },
  { id: 3,  name: 'Terminus 100',           lat: 33.8490, lng: -84.3640, type: 'Office', status: 'Active',    sqft: 62000,  tenant: 'Amazon Web Services',   rentPSF: 42.00 },
  { id: 4,  name: '1180 Peachtree',         lat: 33.7854, lng: -84.3832, type: 'Office', status: 'Expiring',  sqft: 31500,  tenant: 'PwC Advisory',          rentPSF: 46.50 },
  { id: 5,  name: 'Promenade',              lat: 33.7837, lng: -84.3830, type: 'Office', status: 'Expiring',  sqft: 85000,  tenant: 'Bank of America',       rentPSF: 37.00 },
  { id: 6,  name: 'Three Alliance Center',  lat: 33.8492, lng: -84.3628, type: 'Office', status: 'Active',    sqft: 22000,  tenant: 'Salesforce Inc.',       rentPSF: 48.00 },
  { id: 7,  name: 'NCR Global HQ',          lat: 33.7804, lng: -84.3942, type: 'Office', status: 'Active',    sqft: 140000, tenant: 'NCR Corporation',       rentPSF: 33.50 },
  { id: 8,  name: 'Perimeter Center',       lat: 33.9204, lng: -84.3515, type: 'Office', status: 'Expiring',  sqft: 72000,  tenant: 'Cox Communications',    rentPSF: 29.00 },
  { id: 9,  name: 'Colony Square Tower II', lat: 33.7866, lng: -84.3838, type: 'Office', status: 'Comp',      sqft: 38500,  tenant: 'Cardlytics',            rentPSF: 49.50 },
  { id: 10, name: 'Ponce City Market',      lat: 33.7729, lng: -84.3679, type: 'Office', status: 'Comp',      sqft: 19500,  tenant: 'PTC Inc.',              rentPSF: 54.00 },
  { id: 11, name: 'Atlantic Yards Tower A', lat: 33.7792, lng: -84.4015, type: 'Office', status: 'Comp',      sqft: 48000,  tenant: 'Microsoft Corp',        rentPSF: 47.50 },
  { id: 12, name: 'Midtown Union',          lat: 33.7895, lng: -84.3808, type: 'Office', status: 'Active',    sqft: 18000,  tenant: 'Slalom Consulting',     rentPSF: 50.00 },
];

export const timList = [
  { id: 1, tenant: 'Equifax Inc.',         size: '80,000–120,000 SF', market: 'Atlanta', submarket: 'Midtown/Buckhead', timing: 'Q3 2026', requirement: 'HQ Consolidation',    broker: 'JLL – Tom Bradley',       status: 'Active Search', budget: '$48–54 PSF', notes: 'Evaluating 3 options; strong preference for MARTA access. Decisions expected by Q2 2025.' },
  { id: 2, tenant: 'Fiserv Inc.',          size: '40,000–60,000 SF',  market: 'Atlanta', submarket: 'Buckhead',         timing: 'Q1 2026', requirement: 'New Office',          broker: 'CBRE – Lisa Monroe',      status: 'Site Touring', budget: '$44–50 PSF',  notes: 'Fintech client expanding Atlanta presence. Has toured Buckhead Village and Two Alliance Center.' },
  { id: 3, tenant: 'WEX Inc.',             size: '18,000–25,000 SF',  market: 'Atlanta', submarket: 'Midtown',          timing: 'Q4 2025', requirement: 'Relocation',          broker: 'Newmark – Chris Duval',   status: 'LOI Stage',    budget: '$50–56 PSF',  notes: 'Close to executing LOI at Coda. One remaining negotiation point on TI allowance.' },
  { id: 4, tenant: 'Damballa (Forcepoint)',size: '12,000–18,000 SF',  market: 'Atlanta', submarket: 'Any',              timing: 'Q2 2026', requirement: 'Expansion',           broker: 'Cushman – Anne Rivers',   status: 'Preliminary',  budget: '$38–44 PSF',  notes: 'Cybersecurity firm growing rapidly. Early-stage, no tours scheduled yet.' },
  { id: 5, tenant: 'Inspire Brands',       size: '55,000–70,000 SF',  market: 'Atlanta', submarket: 'Sandy Springs',    timing: 'Q2 2026', requirement: 'Renewal/Relocation',  broker: 'CBRE – Kevin Hall',       status: 'RFP Issued',   budget: '$35–40 PSF',  notes: 'Evaluating current building vs Perimeter submarket peers. RFP responses due Jan 31.' },
  { id: 6, tenant: 'DraftKings',           size: '22,000–30,000 SF',  market: 'Atlanta', submarket: 'Midtown',          timing: 'Q1 2026', requirement: 'New Office',          broker: 'JLL – Sara Nichols',      status: 'Active Search',budget: '$46–52 PSF',  notes: 'Sports tech company establishing Atlanta office. Creative, collaborative environment required.' },
  { id: 7, tenant: 'Tradeweb Markets',     size: '8,000–12,000 SF',   market: 'Atlanta', submarket: 'CBD/Midtown',      timing: 'Q3 2025', requirement: 'New Office',          broker: 'Newmark – Chris Duval',   status: 'Site Touring', budget: '$44–50 PSF',  notes: 'Fintech firm opening Atlanta outpost. Tour of Ponce City Market units scheduled.' },
  { id: 8, tenant: 'Palantir Technologies',size: '30,000–45,000 SF',  market: 'Atlanta', submarket: 'Flexible',         timing: 'Q4 2025', requirement: 'Expansion',           broker: 'Direct',                  status: 'Preliminary',  budget: '$42–48 PSF',  notes: 'Govt & defense analytics firm. Prioritizing access to engineering talent near universities.' },
];

// ── CHART DATA ────────────────────────────────────────────────────────────────

export const leaseExpirationByYear = [
  { year: '2024', sqft: 195000, count: 2 },
  { year: '2025', sqft: 198500, count: 3 },
  { year: '2026', sqft: 117000, count: 2 },
  { year: '2027', sqft: 101000, count: 3 },
  { year: '2028', sqft: 168000, count: 2 },
  { year: '2029', sqft: 22000,  count: 1 },
  { year: '2030+',sqft: 378000, count: 2 },
];

export const rentTrendData = [
  { quarter: 'Q1 23', avgRent: 39.2, marketAvg: 41.5 },
  { quarter: 'Q2 23', avgRent: 40.1, marketAvg: 42.0 },
  { quarter: 'Q3 23', avgRent: 39.8, marketAvg: 42.8 },
  { quarter: 'Q4 23', avgRent: 41.0, marketAvg: 43.2 },
  { quarter: 'Q1 24', avgRent: 41.5, marketAvg: 43.8 },
  { quarter: 'Q2 24', avgRent: 42.2, marketAvg: 44.1 },
  { quarter: 'Q3 24', avgRent: 43.0, marketAvg: 44.9 },
  { quarter: 'Q4 24', avgRent: 43.8, marketAvg: 45.5 },
];

export const marketRentBySubmarket = [
  { submarket: 'Midtown',    rent: 47.2, vacancy: 18.2 },
  { submarket: 'Buckhead',   rent: 44.5, vacancy: 16.8 },
  { submarket: 'CBD',        rent: 38.0, vacancy: 22.1 },
  { submarket: 'Perimeter',  rent: 29.5, vacancy: 24.6 },
  { submarket: 'Cumberland', rent: 27.8, vacancy: 19.3 },
  { submarket: 'Decatur',    rent: 33.5, vacancy: 14.2 },
];


export const spaceEfficiencyData = [
  { category: 'Private Offices', allocated: 19980, recommended: 14000 },
  { category: 'Open Workspace',  allocated: 23100, recommended: 25000 },
  { category: 'Collaboration',   allocated: 14280, recommended: 17000 },
  { category: 'Amenities',       allocated: 8360,  recommended: 9000 },
  { category: 'Common/Utility',  allocated: 4300,  recommended: 4000 },
];
