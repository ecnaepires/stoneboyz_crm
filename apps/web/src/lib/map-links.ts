export const googleMapsDirectionsHref = (addresses: string[]) => {
  const uniqueAddresses = Array.from(
    new Set(addresses.map((address) => address.trim()).filter(Boolean)),
  );

  if (uniqueAddresses.length === 0) {
    return null;
  }

  return `https://www.google.com/maps/dir/${uniqueAddresses
    .map((address) => encodeURIComponent(address))
    .join('/')}`;
};
