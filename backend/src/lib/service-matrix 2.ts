export const SERVICE_MATRIX_CATEGORIES = [
  {
    name: "House Cleaning",
    slug: "house-cleaning",
    icon: "🏠",
    description: "Professional home cleaning for apartments and houses",
    sortOrder: 1,
  },
  {
    name: "Car Detailing",
    slug: "car-detailing",
    icon: "🚗",
    description: "Interior and exterior vehicle detailing services",
    sortOrder: 2,
  },
] as const;

export type PricingUnit = "FIXED" | "PER_SQM";

export interface ServiceMatrixDefinition {
  templateKey: string;
  categorySlug: "house-cleaning" | "car-detailing";
  categoryName: string;
  serviceKey: string;
  serviceTypeName: string;
  serviceLabel: string;
  variantKey: string;
  variantLabel: string;
  variantDescription: string;
  name: string;
  description: string;
  pricingUnit: PricingUnit;
  defaultDurationMin: number;
  sortOrder: number;
}

const carVariants = [
  {
    key: "small",
    label: "Small Cars",
    description: "Hatchbacks and coupes",
  },
  {
    key: "medium",
    label: "Medium Cars",
    description: "Sedans and station wagons",
  },
  {
    key: "large",
    label: "Large Cars",
    description: "SUVs, 4x4s, and vans",
  },
] as const;

const carServices = [
  {
    key: "exteriorWash",
    label: "Exterior Wash",
    description: "Exterior wash, rinse, and dry",
    duration: 45,
  },
  {
    key: "basicInterior",
    label: "Basic Interior",
    description: "Interior vacuuming and surface cleaning",
    duration: 60,
  },
  {
    key: "deepInterior",
    label: "Interior Deep Clean",
    description: "Detailed interior deep cleaning and upholstery care",
    duration: 120,
  },
] as const;

const houseVariants = [
  {
    key: "studio",
    label: "Studio Apartments",
    description: "Up to 40 square meters",
  },
  {
    key: "twoRooms",
    label: "2 Rooms",
    description: "40-65 square meters",
  },
  {
    key: "threeRooms",
    label: "3 Rooms",
    description: "65-90 square meters",
  },
] as const;

const houseServices = [
  {
    key: "maintenanceClean",
    label: "Maintenance Clean",
    description: "Regular upkeep cleaning for homes and apartments",
    duration: 120,
  },
  {
    key: "deepClean",
    label: "Deep Clean",
    description: "Detailed deep cleaning for more intensive jobs",
    duration: 240,
  },
] as const;

export const SERVICE_MATRIX_DEFINITIONS: ServiceMatrixDefinition[] = [
  ...carVariants.flatMap((variant, variantIndex) =>
    carServices.map((service, serviceIndex) => ({
      templateKey: `car-detailing.${variant.key}.${service.key}`,
      categorySlug: "car-detailing" as const,
      categoryName: "Car Detailing",
      serviceKey: service.key,
      serviceTypeName: "Car Detailing",
      serviceLabel: service.label,
      variantKey: variant.key,
      variantLabel: variant.label,
      variantDescription: variant.description,
      name: `${variant.label} - ${service.label}`,
      description: `${service.description}. ${variant.description}.`,
      pricingUnit: "FIXED" as const,
      defaultDurationMin: service.duration,
      sortOrder: variantIndex * 10 + serviceIndex + 1,
    })),
  ),
  ...houseVariants.flatMap((variant, variantIndex) =>
    houseServices.map((service, serviceIndex) => ({
      templateKey: `house-cleaning.${variant.key}.${service.key}`,
      categorySlug: "house-cleaning" as const,
      categoryName: "House Cleaning",
      serviceKey: service.key,
      serviceTypeName: "House Cleaning",
      serviceLabel: service.label,
      variantKey: variant.key,
      variantLabel: variant.label,
      variantDescription: variant.description,
      name: `${variant.label} - ${service.label}`,
      description: `${service.description}. ${variant.description}.`,
      pricingUnit: "FIXED" as const,
      defaultDurationMin: service.duration,
      sortOrder: 100 + variantIndex * 10 + serviceIndex + 1,
    })),
  ),
  ...houseServices.map((service, serviceIndex) => ({
    templateKey: `house-cleaning.largerHouses.${service.key}PerSqm`,
    categorySlug: "house-cleaning" as const,
    categoryName: "House Cleaning",
    serviceKey: `${service.key}PerSqm`,
    serviceTypeName: "House Cleaning",
    serviceLabel: `${service.label} (per m2)`,
    variantKey: "largerHouses",
    variantLabel: "Larger Houses",
    variantDescription: "90+ square meters",
    name: `Larger Houses - ${service.label} (per m2)`,
    description: `${service.description}. Price is calculated per square meter for properties over 90 m2.`,
    pricingUnit: "PER_SQM" as const,
    defaultDurationMin: service.duration,
    sortOrder: 200 + serviceIndex + 1,
  })),
];

export function findServiceMatrixDefinition(templateKey: string) {
  return SERVICE_MATRIX_DEFINITIONS.find((definition) => definition.templateKey === templateKey);
}
