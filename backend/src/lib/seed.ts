import { UserRole, SupportLevel, TicketPriority } from "../generated/prisma/client";
import {prisma} from "./database"
import bcrypt from "bcryptjs";


// Fixed test password for the seeded admin account.
const TEST_PASSWORD = "ChangeMe123!";


// client list 

export const CLIENT_OPTIONS: {
    name : string,
    projectName : string,
  }[] = [
  {
    name : "AADITYA FINANCE & VENTURES",
    projectName : "finance"
  },{
    name : "AASIAN SHIPPING AGENCIES" ,
    projectName : "shipping",
  }
];



// ---- department -> categories -> keywords, all in one place ----
// Keywords are seeded upfront so ticket auto-assignment has something to
// match against as soon as the admin invites and skills-up real agents -
// no pre-created users here, that's intentionally left to the invite flow.


const DEPARTMENTS: Record<string,
  {
    description: string;
    categories: { name: string; defaultSlaHours: number; defaultPriority: TicketPriority; minSupportLevel: SupportLevel }[];
    keywords: { name: string; synonyms: string[] }[];
  }
> = {
  Maintenance: {
    description: "Equipment and vehicle maintenance requests",
    categories: [
      { name: "Breakdown", defaultSlaHours: 2, defaultPriority: TicketPriority.P1, minSupportLevel: SupportLevel.L2 },
      { name: "Scheduled Service", defaultSlaHours: 48, defaultPriority: TicketPriority.P4, minSupportLevel: SupportLevel.L1 },
      { name: "Parts Request", defaultSlaHours: 24, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
    ],
    keywords: [
      { name: "Engine", synonyms: ["engine failure", "overheating", "oil leak", "coolant"] },
      { name: "Hydraulics", synonyms: ["hydraulic", "boom", "cylinder", "hose leak"] },
      { name: "Tires", synonyms: ["tyre", "flat tire", "tread", "puncture"] },
      { name: "Electrical", synonyms: ["wiring", "battery", "alternator", "fuse"] },
      { name: "Preventive Maintenance", synonyms: ["pm schedule", "service due", "inspection"] },
    ],
  },
  Operations: {
    description: "Day-to-day site and project operations",
    categories: [
      { name: "Site Issue", defaultSlaHours: 8, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L1 },
      { name: "Scheduling Conflict", defaultSlaHours: 24, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
      { name: "General Operations Request", defaultSlaHours: 24, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
    ],
    keywords: [
      { name: "Site Access", synonyms: ["gate pass", "site entry", "checkpoint"] },
      { name: "Manpower", synonyms: ["staffing", "operator shortage", "crew"] },
      { name: "Project Delay", synonyms: ["schedule slip", "delay", "downtime"] },
      { name: "Documentation", synonyms: ["work order", "job card", "permit"] },
    ],
  },
  Safety: {
    description: "Health, safety, and incident reporting",
    categories: [
      { name: "Incident Report", defaultSlaHours: 1, defaultPriority: TicketPriority.P1, minSupportLevel: SupportLevel.L2 },
      { name: "Near Miss", defaultSlaHours: 8, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L2 },
      { name: "Safety Equipment Request", defaultSlaHours: 24, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
      { name: "Compliance / Audit", defaultSlaHours: 48, defaultPriority: TicketPriority.P4, minSupportLevel: SupportLevel.L2 },
    ],
    keywords: [
      { name: "Injury", synonyms: ["accident", "hurt", "medical", "first aid"] },
      { name: "PPE", synonyms: ["helmet", "harness", "gloves", "safety vest", "goggles"] },
      { name: "Hazard", synonyms: ["hazard", "unsafe condition", "spill", "fall risk"] },
      { name: "Equipment Lockout", synonyms: ["lockout", "tagout", "loto"] },
      { name: "Inspection Failure", synonyms: ["failed inspection", "non-compliant", "violation"] },
    ],
  },
  Logistics: {
    description: "Transport, delivery, and movement of equipment/materials",
    categories: [
      { name: "Delivery Delay", defaultSlaHours: 8, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L1 },
      { name: "Dispatch Request", defaultSlaHours: 12, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L1 },
      { name: "General Logistics Request", defaultSlaHours: 24, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
    ],
    keywords: [
      { name: "Transport", synonyms: ["trailer", "trucking", "haulage", "transport"] },
      { name: "Route", synonyms: ["route plan", "detour", "permit route"] },
      { name: "Loading", synonyms: ["loading", "unloading", "rigging"] },
      { name: "Tracking", synonyms: ["shipment status", "eta", "gps tracking"] },
    ],
  },
  "Supply Chain Management (Market Hired Vehicle)": {
    description: "Procurement and management of market-hired vehicles/equipment",
    categories: [
      { name: "Vehicle Hire Request", defaultSlaHours: 24, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
      { name: "Vendor Issue", defaultSlaHours: 24, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
      { name: "Contract Renewal", defaultSlaHours: 72, defaultPriority: TicketPriority.P4, minSupportLevel: SupportLevel.L2 },
    ],
    keywords: [
      { name: "Market Hire", synonyms: ["mhv", "hired vehicle", "rental vehicle", "third-party vehicle"] },
      { name: "Vendor", synonyms: ["supplier", "contractor", "vendor payment"] },
      { name: "Procurement", synonyms: ["purchase order", "quotation", "rfq"] },
      { name: "Rate Contract", synonyms: ["rate card", "contract terms", "renewal"] },
    ],
  },
  "Human Resource (HR) / (Site-HR)": {
    description: "Employee and site-level HR requests",
    categories: [
      { name: "General HR Request", defaultSlaHours: 24, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
      { name: "Site-HR Request", defaultSlaHours: 24, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
      { name: "Grievance", defaultSlaHours: 48, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L2 },
    ],
    keywords: [
      { name: "Payroll", synonyms: ["paycheck", "salary", "direct deposit", "payslip"] },
      { name: "Leave Request", synonyms: ["pto", "vacation", "sick leave", "time off"] },
      { name: "Onboarding", synonyms: ["new hire", "orientation", "badge", "induction"] },
      { name: "Attendance", synonyms: ["biometric", "timesheet", "shift", "roster"] },
      { name: "Site Welfare", synonyms: ["accommodation", "mess", "camp facilities"] },
    ],
  },
  "Billing Issue": {
    description: "Invoicing, billing disputes, and payment issues",
    categories: [
      { name: "Invoice Dispute", defaultSlaHours: 24, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L2 },
      { name: "Payment Delay", defaultSlaHours: 24, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L1 },
      { name: "General Billing Request", defaultSlaHours: 48, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
    ],
    keywords: [
      { name: "Invoice", synonyms: ["invoice", "billing statement", "bill"] },
      { name: "Payment", synonyms: ["payment", "wire transfer", "overdue", "outstanding"] },
      { name: "Rate Discrepancy", synonyms: ["rate mismatch", "overcharge", "billing error"] },
      { name: "Tax", synonyms: ["gst", "vat", "tax invoice"] },
    ],
  },
  "Cross Rental Cranes (CR) - Wet lease / Dry lease": {
    description: "Cross-rental crane requests, wet lease and dry lease arrangements",
    categories: [
      { name: "Wet Lease Request", defaultSlaHours: 12, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L2 },
      { name: "Dry Lease Request", defaultSlaHours: 12, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L1 },
      { name: "Crane Availability", defaultSlaHours: 8, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L1 },
    ],
    keywords: [
      { name: "Wet Lease", synonyms: ["wet lease", "operator included", "crane with operator"] },
      { name: "Dry Lease", synonyms: ["dry lease", "without operator", "equipment only"] },
      { name: "Crane", synonyms: ["crawler crane", "mobile crane", "tower crane", "lifting capacity"] },
      { name: "Cross Rental", synonyms: ["cr request", "inter-branch rental", "cross hire"] },
    ],
  },
  Sales: {
    description: "Sales inquiries, quotations, and customer requests",
    categories: [
      { name: "Quotation Request", defaultSlaHours: 24, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
      { name: "Customer Complaint", defaultSlaHours: 12, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L2 },
      { name: "New Lead", defaultSlaHours: 48, defaultPriority: TicketPriority.P4, minSupportLevel: SupportLevel.L1 },
    ],
    keywords: [
      { name: "Quotation", synonyms: ["quote", "estimate", "pricing"] },
      { name: "Lead", synonyms: ["prospect", "inquiry", "new customer"] },
      { name: "Contract", synonyms: ["agreement", "sales order", "terms"] },
      { name: "Complaint", synonyms: ["complaint", "dissatisfied", "escalation from client"] },
    ],
  },
};

async function main() {

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  const globalAdmin = await prisma.user.create({
    data: {
      email: "admin@sanghvi.com",
      fullName: "Sanghvi Movers Admin",
      passwordHash,
      role: UserRole.GLOBAL_ADMIN,
    },
  });

  for (const [deptName, deptData] of Object.entries(DEPARTMENTS)) {
    const department = await prisma.department.create({
      data: { name: deptName, description: deptData.description },
    });


    await prisma.ticketCategory.createMany({
      data: deptData.categories.map((c) => ({
        departmentId: department.id,
        name: c.name,
        defaultSlaHours: c.defaultSlaHours,
        defaultPriority: c.defaultPriority,
      })),
    });

    await prisma.keyword.createMany({
      data: deptData.keywords.map((k) => ({
        departmentId: department.id,
        name: k.name,
        synonyms: k.synonyms,
      })),
    });


  }
  

    await prisma.client.createMany({
      data: CLIENT_OPTIONS.map((client) => ({
        name : client.name,
        projectName : client.projectName
      })),
      skipDuplicates: true, // Prevents duplicate inserts
    });

    console.log("client seeded successfully!");

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());