import type { DesignSystemWorkflowRequest } from "@/application/services";

export const SAMPLE_ARCHITECTURE: DesignSystemWorkflowRequest = {
  metadata: {
    name: "Resilient checkout platform",
    description:
      "A provider-neutral reference design with explicit evidence, partial technology choices, and unresolved provider decisions to review.",
  },
  requirements: [
    {
      key: "availability",
      statement: "Checkout must remain available during a zonal failure.",
      category: "reliability",
      priority: "critical",
      target: "99.95% monthly availability",
    },
    {
      key: "latency",
      statement: "Interactive checkout requests must remain responsive at peak load.",
      category: "performance",
      priority: "high",
      target: "p95 below 300 ms",
    },
    {
      key: "auditability",
      statement: "Payment-related operations must produce searchable audit evidence.",
      category: "compliance",
      priority: "high",
    },
  ],
  constraints: [
    {
      key: "typescript-team",
      kind: "skill",
      statement: "The delivery team operates TypeScript services.",
      severity: "preference",
      value: ["typescript", "nodejs", "react"],
      source: "Sample team profile",
    },
    {
      key: "portable-design",
      kind: "operational",
      statement: "Keep provider selection explicit until operational evidence is reviewed.",
      severity: "preference",
      value: "provider-neutral",
      source: "Sample architecture principle",
    },
  ],
  components: [
    {
      key: "storefront",
      capabilityId: "capability-web-interface",
      name: "Checkout storefront",
      description: "Collects basket, identity, and payment intent from customers.",
      position: { x: 80, y: 100 },
    },
    {
      key: "checkout-api",
      capabilityId: "capability-api",
      name: "Checkout API",
      description: "Coordinates checkout commands and transactional boundaries.",
      position: { x: 400, y: 100 },
    },
    {
      key: "orders",
      capabilityId: "capability-database",
      name: "Orders database",
      description: "Stores transactional order and payment state.",
      position: { x: 720, y: 40 },
    },
    {
      key: "fulfilment-queue",
      capabilityId: "capability-queue",
      name: "Fulfilment queue",
      description: "Buffers order fulfilment work after checkout completes.",
      position: { x: 720, y: 250 },
    },
    {
      key: "telemetry",
      capabilityId: "capability-observability",
      name: "Checkout telemetry",
      description: "Collects traces, metrics, and audit-oriented operational signals.",
      position: { x: 400, y: 340 },
    },
  ],
  connections: [
    {
      key: "storefront-api",
      sourceComponentKey: "storefront",
      targetComponentKey: "checkout-api",
      relationship: "request",
      label: "submits checkout",
    },
    {
      key: "api-orders",
      sourceComponentKey: "checkout-api",
      targetComponentKey: "orders",
      relationship: "data",
      label: "persists orders",
    },
    {
      key: "api-fulfilment",
      sourceComponentKey: "checkout-api",
      targetComponentKey: "fulfilment-queue",
      relationship: "event",
      label: "queues fulfilment",
    },
    {
      key: "api-telemetry",
      sourceComponentKey: "checkout-api",
      targetComponentKey: "telemetry",
      relationship: "data",
      label: "emits telemetry",
    },
  ],
  resolutions: [
    {
      componentKey: "storefront",
      technologyId: "technology-react",
    },
    {
      componentKey: "checkout-api",
      technologyId: "technology-nodejs",
    },
    {
      componentKey: "telemetry",
      technologyId: "technology-opentelemetry",
    },
  ],
};
