import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/cifras")({
  component: CifrasLayout,
});

function CifrasLayout() {
  return <Outlet />;
}