export function Logo({ size = 40 }: { size?: number }) {
  return (
    // Logo oficial de LBC Seguros (lbc.bo)
    <img
      src="/logo-lbc.svg"
      alt="LBC Seguros"
      width={size}
      height={size * 0.56}
      style={{ height: "auto", width: size }}
    />
  );
}
