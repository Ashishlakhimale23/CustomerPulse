import { UserRole, SupportLevel, TicketPriority } from "../generated/prisma/client";
import {prisma} from "./database"
import bcrypt from "bcryptjs";


// Fixed test password for the seeded admin account.
const TEST_PASSWORD = "12345";


// client list 

export const CLIENT_OPTIONS: {
    name : string,
    isKeyClient : boolean,
    projects : { name: string, isShutdownJob: boolean }[],
  }[] = [
  {
    name : "AADITYA FINANCE & VENTURES",
    isKeyClient : true,
    projects : [
      { name : "finance", isShutdownJob : false },
    ],
  },{
    name : "AASIAN SHIPPING AGENCIES" ,
    isKeyClient : false,
    projects : [
      { name : "shipping", isShutdownJob : false },
    ],
  }
];



// ---- department -> categories -> keywords, all in one place ----
// Keywords are seeded upfront so ticket auto-assignment has something to
// match against as soon as the admin invites and skills-up real agents -
// no pre-created users here, that's intentionally left to the invite flow.


const DEPARTMENTS: Record<string,
  {
    description: string;
    // NOTE(added): optional grouping within the department. Categories
    // below can reference one of these by name via subDepartmentName -
    // departments that don't need the extra grouping just omit this.
    subDepartments?: string[];
    categories: {
      name: string;
      defaultSlaMinutes: number;
      defaultPriority: TicketPriority;
      minSupportLevel: SupportLevel;
      // NOTE(added): optional - must match an entry in subDepartments above.
      subDepartmentName?: string;
      // NOTE(added): admin-only classification flags, default false.
      isWorkStopping?: boolean;
      isSafetyViolation?: boolean;
    }[];
    keywords: { name: string; synonyms: string[] }[];
  }
> = {
  Maintenance: {
    description: "Equipment and vehicle maintenance requests",
    subDepartments: ["Heavy Equipment", "Light Vehicles"],
    categories: [
      { name: "Breakdown", defaultSlaMinutes: 120, defaultPriority: TicketPriority.P1, minSupportLevel: SupportLevel.L2, subDepartmentName: "Heavy Equipment", isWorkStopping: true },
      { name: "Scheduled Service", defaultSlaMinutes: 2880, defaultPriority: TicketPriority.P4, minSupportLevel: SupportLevel.L1 },
      { name: "Parts Request", defaultSlaMinutes: 1440, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1, subDepartmentName: "Light Vehicles" },
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
      { name: "Site Issue", defaultSlaMinutes: 480, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L1 },
      { name: "Scheduling Conflict", defaultSlaMinutes: 1440, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
      { name: "General Operations Request", defaultSlaMinutes: 1440, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
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
    subDepartments: ["Site Safety", "Equipment Safety"],
    categories: [
      { name: "Incident Report", defaultSlaMinutes: 60, defaultPriority: TicketPriority.P1, minSupportLevel: SupportLevel.L2, subDepartmentName: "Site Safety", isWorkStopping: true, isSafetyViolation: true },
      { name: "Near Miss", defaultSlaMinutes: 480, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L2, subDepartmentName: "Site Safety", isSafetyViolation: true },
      { name: "Safety Equipment Request", defaultSlaMinutes: 1440, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1, subDepartmentName: "Equipment Safety" },
      { name: "Compliance / Audit", defaultSlaMinutes: 2880, defaultPriority: TicketPriority.P4, minSupportLevel: SupportLevel.L2 },
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
      { name: "Delivery Delay", defaultSlaMinutes: 480, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L1 },
      { name: "Dispatch Request", defaultSlaMinutes: 720, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L1 },
      { name: "General Logistics Request", defaultSlaMinutes: 1440, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
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
      { name: "Vehicle Hire Request", defaultSlaMinutes: 1440, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
      { name: "Vendor Issue", defaultSlaMinutes: 1440, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
      { name: "Contract Renewal", defaultSlaMinutes: 4320, defaultPriority: TicketPriority.P4, minSupportLevel: SupportLevel.L2 },
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
      { name: "General HR Request", defaultSlaMinutes: 1440, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
      { name: "Site-HR Request", defaultSlaMinutes: 1440, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
      { name: "Grievance", defaultSlaMinutes: 2880, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L2 },
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
      { name: "Invoice Dispute", defaultSlaMinutes: 1440, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L2 },
      { name: "Payment Delay", defaultSlaMinutes: 1440, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L1 },
      { name: "General Billing Request", defaultSlaMinutes: 2880, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
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
      { name: "Wet Lease Request", defaultSlaMinutes: 720, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L2 },
      { name: "Dry Lease Request", defaultSlaMinutes: 720, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L1 },
      { name: "Crane Availability", defaultSlaMinutes: 480, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L1 },
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
      { name: "Quotation Request", defaultSlaMinutes: 1440, defaultPriority: TicketPriority.P3, minSupportLevel: SupportLevel.L1 },
      { name: "Customer Complaint", defaultSlaMinutes: 720, defaultPriority: TicketPriority.P2, minSupportLevel: SupportLevel.L2 },
      { name: "New Lead", defaultSlaMinutes: 2880, defaultPriority: TicketPriority.P4, minSupportLevel: SupportLevel.L1 },
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

    // Sub-departments are optional - only a handful of departments define
    // them. Create them first so categories below can be mapped to one.
    const subDepartmentIdByName: Record<string, string> = {};
    if (deptData.subDepartments?.length) {
      for (const subDeptName of deptData.subDepartments) {
        const subDepartment = await prisma.subDepartment.create({
          data: { departmentId: department.id, name: subDeptName },
        });
        subDepartmentIdByName[subDeptName] = subDepartment.id;
      }
    }

    await prisma.ticketCategory.createMany({
      data: deptData.categories.map((c) => ({
        departmentId: department.id,
        subDepartmentId: c.subDepartmentName ? subDepartmentIdByName[c.subDepartmentName] : null,
        name: c.name,
        defaultSlaMinutes: c.defaultSlaMinutes,
        defaultPriority: c.defaultPriority,
        isWorkStopping: c.isWorkStopping ?? false,
        isSafetyViolation: c.isSafetyViolation ?? false,
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
  

    // NOTE(updated): createMany can't do nested writes, and each client can
    // now have multiple projects, so we create clients one at a time
    // (skipping ones that already exist) and nested-create their projects.
    for (const client of CLIENT_OPTIONS) {
      const existing = await prisma.client.findFirst({ where: { name: client.name } });
      if (existing) continue;

      await prisma.client.create({
        data: {
          name: client.name,
          isKeyClient: client.isKeyClient,
          projects: {
            create: client.projects.map((p) => ({
              name: p.name,
              isShutdownJob: p.isShutdownJob,
            })),
          },
        },
      });
    }

    console.log("client seeded successfully!");

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
