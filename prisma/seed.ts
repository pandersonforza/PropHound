import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes } from "crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

async function main() {
  // Clear existing data
  await prisma.task.deleteMany();
  await prisma.session.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.drawLineItem.deleteMany();
  await prisma.drawRequest.deleteMany();
  await prisma.document.deleteMany();
  await prisma.contract.deleteMany();
  await prisma.budgetLineItem.deleteMany();
  await prisma.budgetCategory.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.project.deleteMany();
  await prisma.user.deleteMany();

  // Create Users (default password: "password123")
  const defaultPassword = hashPassword("password123");
  const users = await Promise.all([
    prisma.user.create({
      data: { name: "Russ Orsi", email: "russ@forza.dev", role: "admin", passwordHash: defaultPassword },
    }),
    prisma.user.create({
      data: { name: "Brent Malili", email: "brent@forza.dev", role: "user", passwordHash: defaultPassword },
    }),
    prisma.user.create({
      data: { name: "Terra Johnson", email: "terra@forza.dev", role: "user", passwordHash: defaultPassword },
    }),
    prisma.user.create({
      data: { name: "Porter Anderson", email: "porter@forza.dev", role: "user", passwordHash: defaultPassword },
    }),
  ]);

  // Create Projects
  const projects = await Promise.all([
    prisma.project.create({
      data: {
        name: "The Grand at Riverside",
        address: "1200 River Blvd, Austin, TX 78701",
        type: "Mixed-Use",
        status: "Active",
        stage: "Construction",
        startDate: new Date("2025-03-01"),
        endDate: new Date("2027-06-30"),
        totalBudget: 45000000,
        projectManager: "Sarah Chen",
        description: "35-story mixed-use tower with 280 residential units, 45,000 SF retail, and underground parking.",
      },
    }),
    prisma.project.create({
      data: {
        name: "Oakmont Business Park",
        address: "8500 Oakmont Dr, Denver, CO 80231",
        type: "Commercial",
        status: "Active",
        stage: "Design",
        startDate: new Date("2025-09-15"),
        endDate: new Date("2027-12-31"),
        totalBudget: 28000000,
        projectManager: "Marcus Johnson",
        description: "Three-building Class A office campus with shared amenities and green courtyards.",
      },
    }),
    prisma.project.create({
      data: {
        name: "Sunset Ridge Homes",
        address: "450 Sunset Ridge Rd, Nashville, TN 37215",
        type: "Residential",
        status: "Active",
        stage: "Permitting",
        startDate: new Date("2025-11-01"),
        endDate: new Date("2027-04-30"),
        totalBudget: 12000000,
        projectManager: "Emily Rodriguez",
        description: "48-unit single-family home community with clubhouse and pool.",
      },
    }),
    prisma.project.create({
      data: {
        name: "Downtown Lofts Renovation",
        address: "220 Main St, Portland, OR 97204",
        type: "Residential",
        status: "Completed",
        stage: "Closeout",
        startDate: new Date("2024-01-15"),
        endDate: new Date("2025-11-30"),
        totalBudget: 8000000,
        projectManager: "David Park",
        description: "Historic warehouse conversion into 36 luxury loft apartments.",
      },
    }),
    prisma.project.create({
      data: {
        name: "Harbor Point Industrial",
        address: "9100 Harbor Point Way, Houston, TX 77015",
        type: "Industrial",
        status: "On Hold",
        stage: "Pre-Development",
        startDate: new Date("2026-06-01"),
        endDate: new Date("2028-03-31"),
        totalBudget: 35000000,
        projectManager: "Sarah Chen",
        description: "500,000 SF distribution center with cold storage and rail access.",
      },
    }),
  ]);

  // Create Budget Categories and Line Items for each project
  const budgetData: Record<string, { group: string; items: { desc: string; orig: number; rev: number; committed: number; actual: number }[] }[]> = {
    [projects[0].id]: [
      {
        group: "Hard Costs",
        items: [
          { desc: "General Conditions", orig: 3200000, rev: 3400000, committed: 3400000, actual: 2800000 },
          { desc: "Concrete & Masonry", orig: 8500000, rev: 8500000, committed: 8200000, actual: 6100000 },
          { desc: "Structural Steel", orig: 5200000, rev: 5600000, committed: 5600000, actual: 4200000 },
          { desc: "MEP Systems", orig: 6800000, rev: 7100000, committed: 6900000, actual: 3500000 },
          { desc: "Interior Finishes", orig: 4500000, rev: 4500000, committed: 3200000, actual: 1200000 },
        ],
      },
      {
        group: "Soft Costs",
        items: [
          { desc: "Architectural Fees", orig: 2700000, rev: 2900000, committed: 2900000, actual: 2400000 },
          { desc: "Engineering Fees", orig: 1800000, rev: 1800000, committed: 1800000, actual: 1500000 },
          { desc: "Legal & Accounting", orig: 600000, rev: 650000, committed: 500000, actual: 420000 },
          { desc: "Permits & Fees", orig: 450000, rev: 480000, committed: 480000, actual: 480000 },
        ],
      },
      {
        group: "Financing",
        items: [
          { desc: "Construction Loan Interest", orig: 4200000, rev: 4500000, committed: 4500000, actual: 2100000 },
          { desc: "Loan Origination Fees", orig: 900000, rev: 900000, committed: 900000, actual: 900000 },
        ],
      },
      {
        group: "Land",
        items: [
          { desc: "Land Acquisition", orig: 5800000, rev: 5800000, committed: 5800000, actual: 5800000 },
          { desc: "Site Preparation", orig: 350000, rev: 370000, committed: 370000, actual: 370000 },
        ],
      },
    ],
    [projects[1].id]: [
      {
        group: "Hard Costs",
        items: [
          { desc: "Site Work & Utilities", orig: 2200000, rev: 2200000, committed: 1800000, actual: 400000 },
          { desc: "Building Shell", orig: 9500000, rev: 9500000, committed: 0, actual: 0 },
          { desc: "Interior Build-out", orig: 4800000, rev: 4800000, committed: 0, actual: 0 },
          { desc: "Parking Structure", orig: 3200000, rev: 3200000, committed: 0, actual: 0 },
        ],
      },
      {
        group: "Soft Costs",
        items: [
          { desc: "Architecture & Design", orig: 2100000, rev: 2300000, committed: 2300000, actual: 1200000 },
          { desc: "Engineering", orig: 1400000, rev: 1400000, committed: 1400000, actual: 600000 },
          { desc: "Legal & Insurance", orig: 800000, rev: 800000, committed: 500000, actual: 300000 },
        ],
      },
      {
        group: "Financing",
        items: [
          { desc: "Construction Loan", orig: 2000000, rev: 2000000, committed: 2000000, actual: 200000 },
        ],
      },
      {
        group: "Land",
        items: [
          { desc: "Land Purchase", orig: 1800000, rev: 1800000, committed: 1800000, actual: 1800000 },
        ],
      },
    ],
    [projects[2].id]: [
      {
        group: "Hard Costs",
        items: [
          { desc: "Site Development", orig: 1500000, rev: 1500000, committed: 0, actual: 0 },
          { desc: "Home Construction", orig: 6000000, rev: 6000000, committed: 0, actual: 0 },
          { desc: "Landscaping & Common Areas", orig: 800000, rev: 800000, committed: 0, actual: 0 },
        ],
      },
      {
        group: "Soft Costs",
        items: [
          { desc: "Design & Engineering", orig: 900000, rev: 950000, committed: 950000, actual: 600000 },
          { desc: "Permits & Entitlements", orig: 350000, rev: 400000, committed: 400000, actual: 200000 },
        ],
      },
      {
        group: "Financing",
        items: [
          { desc: "Development Loan", orig: 800000, rev: 800000, committed: 800000, actual: 100000 },
        ],
      },
      {
        group: "Land",
        items: [
          { desc: "Land Acquisition", orig: 1500000, rev: 1500000, committed: 1500000, actual: 1500000 },
        ],
      },
    ],
    [projects[3].id]: [
      {
        group: "Hard Costs",
        items: [
          { desc: "Structural Renovation", orig: 2200000, rev: 2400000, committed: 2400000, actual: 2400000 },
          { desc: "MEP Upgrades", orig: 1500000, rev: 1650000, committed: 1650000, actual: 1650000 },
          { desc: "Interior Finishes", orig: 1800000, rev: 1800000, committed: 1800000, actual: 1750000 },
        ],
      },
      {
        group: "Soft Costs",
        items: [
          { desc: "Architecture", orig: 600000, rev: 620000, committed: 620000, actual: 620000 },
          { desc: "Legal & Permits", orig: 300000, rev: 310000, committed: 310000, actual: 310000 },
        ],
      },
      {
        group: "Financing",
        items: [
          { desc: "Bridge Loan Interest", orig: 500000, rev: 520000, committed: 520000, actual: 520000 },
        ],
      },
      {
        group: "Land",
        items: [
          { desc: "Building Purchase", orig: 1000000, rev: 1000000, committed: 1000000, actual: 1000000 },
        ],
      },
    ],
    [projects[4].id]: [
      {
        group: "Hard Costs",
        items: [
          { desc: "Site Preparation", orig: 3500000, rev: 3500000, committed: 0, actual: 0 },
          { desc: "Building Construction", orig: 18000000, rev: 18000000, committed: 0, actual: 0 },
          { desc: "Cold Storage Systems", orig: 4500000, rev: 4500000, committed: 0, actual: 0 },
        ],
      },
      {
        group: "Soft Costs",
        items: [
          { desc: "Engineering & Design", orig: 2500000, rev: 2500000, committed: 1200000, actual: 400000 },
          { desc: "Environmental Studies", orig: 800000, rev: 800000, committed: 800000, actual: 600000 },
        ],
      },
      {
        group: "Financing",
        items: [
          { desc: "Construction Financing", orig: 3000000, rev: 3000000, committed: 0, actual: 0 },
        ],
      },
      {
        group: "Land",
        items: [
          { desc: "Land & Rail Easement", orig: 2500000, rev: 2500000, committed: 2500000, actual: 2500000 },
        ],
      },
    ],
  };

  const allLineItems: Record<string, string> = {}; // description -> id mapping

  for (const [projectId, categories] of Object.entries(budgetData)) {
    for (const cat of categories) {
      const category = await prisma.budgetCategory.create({
        data: {
          projectId,
          name: cat.group === "Hard Costs" ? "Hard Costs" : cat.group === "Soft Costs" ? "Soft Costs" : cat.group === "Financing" ? "Financing Costs" : "Land & Acquisition",
          categoryGroup: cat.group,
        },
      });

      for (const item of cat.items) {
        const lineItem = await prisma.budgetLineItem.create({
          data: {
            categoryId: category.id,
            description: item.desc,
            originalBudget: item.orig,
            revisedBudget: item.rev,
            committedCost: item.committed,
            actualCost: item.actual,
          },
        });
        allLineItems[`${projectId}:${item.desc}`] = lineItem.id;
      }
    }
  }

  // Create Vendors
  const vendors = await Promise.all([
    prisma.vendor.create({
      data: { name: "Mike Torres", email: "mike@apexbuilders.com", phone: "(512) 555-0101", company: "Apex Builders Inc.", category: "General Contractor", status: "Preferred" },
    }),
    prisma.vendor.create({
      data: { name: "Lisa Chang", email: "lisa@structuraldesign.com", phone: "(303) 555-0202", company: "Structural Design Partners", category: "Consultant", status: "Active" },
    }),
    prisma.vendor.create({
      data: { name: "Robert Williams", email: "rwilliams@precisionmep.com", phone: "(615) 555-0303", company: "Precision MEP Solutions", category: "Subcontractor", status: "Active" },
    }),
    prisma.vendor.create({
      data: { name: "Amanda Foster", email: "afoster@fosterarch.com", phone: "(503) 555-0404", company: "Foster Architecture Group", category: "Consultant", status: "Preferred" },
    }),
    prisma.vendor.create({
      data: { name: "James O'Brien", email: "james@concretepro.com", phone: "(512) 555-0505", company: "ConcretePro Texas", category: "Subcontractor", status: "Active" },
    }),
    prisma.vendor.create({
      data: { name: "Patricia Nguyen", email: "pnguyen@enviroassess.com", phone: "(713) 555-0606", company: "EnviroAssess LLC", category: "Consultant", status: "Active" },
    }),
    prisma.vendor.create({
      data: { name: "David Kim", email: "dkim@steelworksusa.com", phone: "(512) 555-0707", company: "SteelWorks USA", category: "Supplier", status: "Active" },
    }),
    prisma.vendor.create({
      data: { name: "Rachel Cooper", email: "rcooper@cooperlegal.com", phone: "(512) 555-0808", company: "Cooper Legal Associates", category: "Consultant", status: "Active" },
    }),
    prisma.vendor.create({
      data: { name: "Thomas Garcia", email: "tgarcia@greenscapepro.com", phone: "(615) 555-0909", company: "GreenScape Pro", category: "Subcontractor", status: "Inactive" },
    }),
    prisma.vendor.create({
      data: { name: "Jennifer White", email: "jwhite@whiteinteriors.com", phone: "(503) 555-1010", company: "White Interiors Design", category: "Subcontractor", status: "Active" },
    }),
  ]);

  // Create Contracts
  await Promise.all([
    // Project 1 - The Grand at Riverside
    prisma.contract.create({
      data: {
        projectId: projects[0].id, vendorId: vendors[0].id, title: "General Construction Services",
        amount: 28200000, type: "GMP", status: "In Progress", startDate: new Date("2025-06-01"), endDate: new Date("2027-04-30"),
        lineItemId: allLineItems[`${projects[0].id}:General Conditions`],
      },
    }),
    prisma.contract.create({
      data: {
        projectId: projects[0].id, vendorId: vendors[3].id, title: "Architectural Design Services",
        amount: 2900000, type: "Lump Sum", status: "Executed", startDate: new Date("2025-03-01"), endDate: new Date("2026-12-31"),
        lineItemId: allLineItems[`${projects[0].id}:Architectural Fees`],
      },
    }),
    prisma.contract.create({
      data: {
        projectId: projects[0].id, vendorId: vendors[4].id, title: "Concrete & Foundation Work",
        amount: 8200000, type: "Lump Sum", status: "In Progress", startDate: new Date("2025-08-01"), endDate: new Date("2026-10-31"),
        lineItemId: allLineItems[`${projects[0].id}:Concrete & Masonry`],
      },
    }),
    prisma.contract.create({
      data: {
        projectId: projects[0].id, vendorId: vendors[6].id, title: "Structural Steel Supply",
        amount: 5600000, type: "Lump Sum", status: "In Progress", startDate: new Date("2025-09-01"), endDate: new Date("2026-08-31"),
        lineItemId: allLineItems[`${projects[0].id}:Structural Steel`],
      },
    }),
    prisma.contract.create({
      data: {
        projectId: projects[0].id, vendorId: vendors[2].id, title: "MEP Installation",
        amount: 6900000, type: "GMP", status: "Executed", startDate: new Date("2025-11-01"), endDate: new Date("2027-02-28"),
        lineItemId: allLineItems[`${projects[0].id}:MEP Systems`],
      },
    }),
    // Project 2 - Oakmont Business Park
    prisma.contract.create({
      data: {
        projectId: projects[1].id, vendorId: vendors[3].id, title: "Campus Architecture & Planning",
        amount: 2300000, type: "Lump Sum", status: "In Progress", startDate: new Date("2025-09-15"), endDate: new Date("2026-09-15"),
        lineItemId: allLineItems[`${projects[1].id}:Architecture & Design`],
      },
    }),
    prisma.contract.create({
      data: {
        projectId: projects[1].id, vendorId: vendors[1].id, title: "Structural Engineering",
        amount: 1400000, type: "Time & Materials", status: "In Progress", startDate: new Date("2025-10-01"), endDate: new Date("2026-06-30"),
        lineItemId: allLineItems[`${projects[1].id}:Engineering`],
      },
    }),
    prisma.contract.create({
      data: {
        projectId: projects[1].id, vendorId: vendors[0].id, title: "Site Work & Utilities",
        amount: 1800000, type: "GMP", status: "Executed", startDate: new Date("2026-03-01"), endDate: new Date("2026-09-30"),
        lineItemId: allLineItems[`${projects[1].id}:Site Work & Utilities`],
      },
    }),
    // Project 3 - Sunset Ridge Homes
    prisma.contract.create({
      data: {
        projectId: projects[2].id, vendorId: vendors[3].id, title: "Community Design Services",
        amount: 950000, type: "Lump Sum", status: "Executed", startDate: new Date("2025-11-01"), endDate: new Date("2026-06-30"),
        lineItemId: allLineItems[`${projects[2].id}:Design & Engineering`],
      },
    }),
    // Project 4 - Downtown Lofts
    prisma.contract.create({
      data: {
        projectId: projects[3].id, vendorId: vendors[0].id, title: "Renovation General Contractor",
        amount: 5850000, type: "GMP", status: "Complete", startDate: new Date("2024-03-01"), endDate: new Date("2025-10-31"),
      },
    }),
    prisma.contract.create({
      data: {
        projectId: projects[3].id, vendorId: vendors[9].id, title: "Interior Design & Finishes",
        amount: 1800000, type: "Lump Sum", status: "Complete", startDate: new Date("2024-06-01"), endDate: new Date("2025-09-30"),
        lineItemId: allLineItems[`${projects[3].id}:Interior Finishes`],
      },
    }),
    // Project 5 - Harbor Point
    prisma.contract.create({
      data: {
        projectId: projects[4].id, vendorId: vendors[5].id, title: "Environmental Impact Assessment",
        amount: 800000, type: "Lump Sum", status: "In Progress", startDate: new Date("2025-06-01"), endDate: new Date("2026-03-31"),
        lineItemId: allLineItems[`${projects[4].id}:Environmental Studies`],
      },
    }),
    prisma.contract.create({
      data: {
        projectId: projects[4].id, vendorId: vendors[1].id, title: "Preliminary Engineering",
        amount: 1200000, type: "Time & Materials", status: "Executed", startDate: new Date("2025-09-01"), endDate: new Date("2026-06-30"),
        lineItemId: allLineItems[`${projects[4].id}:Engineering & Design`],
      },
    }),
  ]);

  // Create Draw Requests
  // Project 1 - 4 draws
  const draw1_1 = await prisma.drawRequest.create({
    data: {
      projectId: projects[0].id, drawNumber: 1, status: "Funded", totalAmount: 8500000,
      submittedDate: new Date("2025-07-15"), approvedDate: new Date("2025-07-22"), fundedDate: new Date("2025-07-30"),
      notes: "Initial mobilization and foundation work",
    },
  });
  const draw1_2 = await prisma.drawRequest.create({
    data: {
      projectId: projects[0].id, drawNumber: 2, status: "Funded", totalAmount: 9200000,
      submittedDate: new Date("2025-10-01"), approvedDate: new Date("2025-10-08"), fundedDate: new Date("2025-10-15"),
      notes: "Structural steel and concrete pour phases 1-3",
    },
  });
  const draw1_3 = await prisma.drawRequest.create({
    data: {
      projectId: projects[0].id, drawNumber: 3, status: "Approved", totalAmount: 7800000,
      submittedDate: new Date("2026-01-10"), approvedDate: new Date("2026-01-17"),
      notes: "MEP rough-in and exterior envelope",
    },
  });
  const draw1_4 = await prisma.drawRequest.create({
    data: {
      projectId: projects[0].id, drawNumber: 4, status: "Draft", totalAmount: 5270000,
      notes: "Interior framing and finishes - phase 1",
    },
  });

  // Project 2 - 2 draws
  const draw2_1 = await prisma.drawRequest.create({
    data: {
      projectId: projects[1].id, drawNumber: 1, status: "Funded", totalAmount: 2500000,
      submittedDate: new Date("2026-01-15"), approvedDate: new Date("2026-01-22"), fundedDate: new Date("2026-01-30"),
      notes: "Design fees and site preparation",
    },
  });
  const draw2_2 = await prisma.drawRequest.create({
    data: {
      projectId: projects[1].id, drawNumber: 2, status: "Submitted", totalAmount: 2000000,
      submittedDate: new Date("2026-03-01"),
      notes: "Continued design work and engineering",
    },
  });

  // Project 3 - 1 draw
  const draw3_1 = await prisma.drawRequest.create({
    data: {
      projectId: projects[2].id, drawNumber: 1, status: "Funded", totalAmount: 2400000,
      submittedDate: new Date("2026-01-05"), approvedDate: new Date("2026-01-12"), fundedDate: new Date("2026-01-20"),
      notes: "Land acquisition and initial design fees",
    },
  });

  // Project 4 - 3 draws (all funded - completed project)
  const draw4_1 = await prisma.drawRequest.create({
    data: {
      projectId: projects[3].id, drawNumber: 1, status: "Funded", totalAmount: 2800000,
      submittedDate: new Date("2024-04-15"), approvedDate: new Date("2024-04-22"), fundedDate: new Date("2024-04-30"),
      notes: "Demolition and structural work",
    },
  });
  const draw4_2 = await prisma.drawRequest.create({
    data: {
      projectId: projects[3].id, drawNumber: 2, status: "Funded", totalAmount: 3200000,
      submittedDate: new Date("2024-08-01"), approvedDate: new Date("2024-08-08"), fundedDate: new Date("2024-08-15"),
      notes: "MEP upgrades and interior framing",
    },
  });
  const draw4_3 = await prisma.drawRequest.create({
    data: {
      projectId: projects[3].id, drawNumber: 3, status: "Funded", totalAmount: 2250000,
      submittedDate: new Date("2025-02-01"), approvedDate: new Date("2025-02-08"), fundedDate: new Date("2025-02-15"),
      notes: "Final finishes and closeout",
    },
  });

  // Create Draw Line Items (simplified - link major ones)
  const p0LineItems = Object.entries(allLineItems).filter(([k]) => k.startsWith(projects[0].id));
  const p1LineItems = Object.entries(allLineItems).filter(([k]) => k.startsWith(projects[1].id));
  const p2LineItems = Object.entries(allLineItems).filter(([k]) => k.startsWith(projects[2].id));

  // Draw 1-1 line items
  for (const [key, id] of p0LineItems.slice(0, 3)) {
    await prisma.drawLineItem.create({
      data: { drawRequestId: draw1_1.id, budgetLineItemId: id, currentAmount: 3000000, previousDraws: 0, thisDrawAmount: 2800000 },
    });
  }
  // Draw 1-2 line items
  for (const [key, id] of p0LineItems.slice(1, 4)) {
    await prisma.drawLineItem.create({
      data: { drawRequestId: draw1_2.id, budgetLineItemId: id, currentAmount: 6000000, previousDraws: 2800000, thisDrawAmount: 3100000 },
    });
  }
  // Draw 1-3 line items
  for (const [key, id] of p0LineItems.slice(2, 5)) {
    await prisma.drawLineItem.create({
      data: { drawRequestId: draw1_3.id, budgetLineItemId: id, currentAmount: 5000000, previousDraws: 5900000, thisDrawAmount: 2600000 },
    });
  }

  // Documents
  await Promise.all([
    prisma.document.create({ data: { projectId: projects[0].id, name: "Construction Permit - Phase 1", category: "Permits", notes: "Approved by City of Austin" } }),
    prisma.document.create({ data: { projectId: projects[0].id, name: "GMP Contract - Apex Builders", category: "Contracts", notes: "Executed 6/1/2025" } }),
    prisma.document.create({ data: { projectId: projects[0].id, name: "Builder's Risk Insurance Policy", category: "Insurance", notes: "Policy #BR-2025-4521" } }),
    prisma.document.create({ data: { projectId: projects[0].id, name: "Structural Drawings Rev C", category: "Plans", notes: "Latest revision from structural engineer" } }),
    prisma.document.create({ data: { projectId: projects[0].id, name: "Phase 1 Inspection Report", category: "Reports", notes: "Foundation inspection passed" } }),
    prisma.document.create({ data: { projectId: projects[1].id, name: "Schematic Design Package", category: "Plans", notes: "Approved by ownership group" } }),
    prisma.document.create({ data: { projectId: projects[1].id, name: "Environmental Assessment", category: "Reports", notes: "Phase 1 ESA - clean site" } }),
    prisma.document.create({ data: { projectId: projects[1].id, name: "Architecture Agreement", category: "Contracts", notes: "Foster Architecture Group" } }),
    prisma.document.create({ data: { projectId: projects[1].id, name: "General Liability Insurance", category: "Insurance", notes: "Annual renewal due 9/2026" } }),
    prisma.document.create({ data: { projectId: projects[2].id, name: "Subdivision Plat Application", category: "Permits", notes: "Submitted to Metro Planning" } }),
    prisma.document.create({ data: { projectId: projects[2].id, name: "Community Design Guidelines", category: "Plans", notes: "HOA standards document" } }),
    prisma.document.create({ data: { projectId: projects[2].id, name: "Geotechnical Report", category: "Reports", notes: "Soil testing results" } }),
    prisma.document.create({ data: { projectId: projects[3].id, name: "Certificate of Occupancy", category: "Permits", notes: "Issued 11/15/2025" } }),
    prisma.document.create({ data: { projectId: projects[3].id, name: "Final Lien Waiver Package", category: "Contracts", notes: "All subs signed off" } }),
    prisma.document.create({ data: { projectId: projects[3].id, name: "As-Built Drawings", category: "Plans", notes: "Complete set filed with city" } }),
    prisma.document.create({ data: { projectId: projects[3].id, name: "Warranty Documentation", category: "Reports", notes: "1-year builder warranty" } }),
    prisma.document.create({ data: { projectId: projects[4].id, name: "Phase 1 Environmental Site Assessment", category: "Reports", notes: "In progress" } }),
    prisma.document.create({ data: { projectId: projects[4].id, name: "Rail Easement Agreement Draft", category: "Contracts", notes: "Under review by legal" } }),
    prisma.document.create({ data: { projectId: projects[4].id, name: "Preliminary Site Plan", category: "Plans", notes: "Concept layout rev A" } }),
    prisma.document.create({ data: { projectId: projects[4].id, name: "Zoning Variance Application", category: "Permits", notes: "Pending city review" } }),
  ]);

  // Create Tasks for each user
  await Promise.all([
    // Sarah's tasks
    prisma.task.create({ data: { userId: users[0].id, title: "Review Q1 budget variance report", priority: "high", projectId: projects[0].id } }),
    prisma.task.create({ data: { userId: users[0].id, title: "Schedule construction site visit", priority: "medium", projectId: projects[0].id } }),
    prisma.task.create({ data: { userId: users[0].id, title: "Finalize GMP contract amendment", priority: "high", projectId: projects[0].id, status: "in_progress" } }),
    prisma.task.create({ data: { userId: users[0].id, title: "Update investor presentation", priority: "low" } }),
    // Marcus's tasks
    prisma.task.create({ data: { userId: users[1].id, title: "Review schematic design revisions", priority: "high", projectId: projects[1].id } }),
    prisma.task.create({ data: { userId: users[1].id, title: "Coordinate with engineering team on parking structure", priority: "medium", projectId: projects[1].id } }),
    prisma.task.create({ data: { userId: users[1].id, title: "Submit permit application for site work", priority: "high", projectId: projects[1].id, status: "in_progress" } }),
    // Emily's tasks
    prisma.task.create({ data: { userId: users[2].id, title: "Review HOA design guidelines draft", priority: "medium", projectId: projects[2].id } }),
    prisma.task.create({ data: { userId: users[2].id, title: "Follow up on zoning variance", priority: "high", projectId: projects[2].id } }),
    prisma.task.create({ data: { userId: users[2].id, title: "Prepare community meeting presentation", priority: "low", projectId: projects[2].id } }),
    // David's tasks
    prisma.task.create({ data: { userId: users[3].id, title: "Complete final punch list items", priority: "high", projectId: projects[3].id, status: "in_progress" } }),
    prisma.task.create({ data: { userId: users[3].id, title: "Collect final lien waivers", priority: "medium", projectId: projects[3].id } }),
    prisma.task.create({ data: { userId: users[3].id, title: "Archive project documentation", priority: "low", projectId: projects[3].id } }),
  ]);

  console.log("Seed data created successfully!");
  console.log(`  - ${users.length} users`);
  console.log(`  - ${projects.length} projects`);
  console.log(`  - ${Object.keys(allLineItems).length} budget line items`);
  console.log(`  - ${vendors.length} vendors`);
  console.log("  - 13 contracts");
  console.log("  - 10 draw requests");
  console.log("  - 20 documents");
  console.log("  - 13 tasks");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
