import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding plans...");

  const plans = [
    {
      name: "free",
      displayName: "Free",
      priceMonthly: 0,
      priceYearly: 0,
      features: [
        "overview_page",
        "basic_analytics",
        "1_client",
        "7d_data_retention",
      ],
      limits: {
        maxClients: 1,
        maxReports: 2,
        dataRetentionDays: 7,
        apiCallsPerDay: 100,
      },
    },
    {
      name: "growth",
      displayName: "Growth",
      priceMonthly: 29,
      priceYearly: 290,
      features: [
        "overview_page",
        "basic_analytics",
        "advanced_analytics",
        "insights_page",
        "5_clients",
        "30d_data_retention",
        "csv_export",
      ],
      limits: {
        maxClients: 5,
        maxReports: 10,
        dataRetentionDays: 30,
        apiCallsPerDay: 1000,
      },
    },
    {
      name: "pro",
      displayName: "Pro",
      priceMonthly: 79,
      priceYearly: 790,
      features: [
        "overview_page",
        "basic_analytics",
        "advanced_analytics",
        "insights_page",
        "growth_plan",
        "reports_page",
        "20_clients",
        "90d_data_retention",
        "csv_export",
        "pdf_export",
        "api_access",
        "cohort_analysis",
        "funnel_analysis",
      ],
      limits: {
        maxClients: 20,
        maxReports: 50,
        dataRetentionDays: 90,
        apiCallsPerDay: 10000,
      },
    },
    {
      name: "enterprise",
      displayName: "Enterprise",
      priceMonthly: 199,
      priceYearly: 1990,
      features: [
        "overview_page",
        "basic_analytics",
        "advanced_analytics",
        "insights_page",
        "growth_plan",
        "reports_page",
        "unlimited_clients",
        "365d_data_retention",
        "csv_export",
        "pdf_export",
        "api_access",
        "cohort_analysis",
        "funnel_analysis",
        "white_label",
        "priority_support",
        "custom_integrations",
        "sso",
      ],
      limits: {
        maxClients: -1, // unlimited
        maxReports: -1,
        dataRetentionDays: 365,
        apiCallsPerDay: -1,
      },
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { name: plan.name },
      update: plan,
      create: plan,
    });
    console.log(`  ✅ Plan "${plan.displayName}" seeded`);
  }

  console.log("✅ Seeding complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
