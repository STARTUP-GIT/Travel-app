import prisma from "../db/prisma.js";

export const findDistrictWithHierarchy = async (districtId: string) => {
  return prisma.district.findUnique({
    where: { id: districtId },
    include: {
      state: {
        include: {
          country: true,
        },
      },
    },
  });
};

export const isDistrictAvailable = (district: {
  isServiceAvailable: boolean;
  state: {
    isServiceAvailable: boolean;
    country: {
      isServiceAvailable: boolean;
    };
  };
}) => {
  return (
    district.isServiceAvailable &&
    district.state.isServiceAvailable &&
    district.state.country.isServiceAvailable
  );
};