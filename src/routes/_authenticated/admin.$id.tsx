import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/admin/$id")({
  component: AdminEditPage,
});

function AdminEditPage() {
  const { id } = Route.useParams();
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold text-foreground">Editar música {id}</h1>
    </div>
  );
}
