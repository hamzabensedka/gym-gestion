export function memberExportSearchWhere(q: string): {
  OR?: Array<
    | { fullName: { contains: string; mode: "insensitive" } }
    | { phone: { contains: string } }
  >;
} {
  const trimmed = q.trim();
  if (!trimmed) return {};
  return {
    OR: [
      { fullName: { contains: trimmed, mode: "insensitive" } },
      { phone: { contains: trimmed } },
    ],
  };
}
