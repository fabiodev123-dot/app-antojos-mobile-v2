"use client";

import { Plus } from "lucide-react";
import {
  categoriasRepository,
  productosRepository,
} from "@/lib/repositories";
import { useRepositoryList } from "@/hooks/use-repository";
import { ShellHeader } from "@/components/layout/shell-header";
import { ButtonLink } from "@/components/ui/button-link";
import { PlatoCard } from "@/components/features/plato-card";
import { CollapsibleSection } from "@/components/features/collapsible-section";

export default function StockPage() {
  const productos = useRepositoryList(productosRepository);
  const categorias = useRepositoryList(categoriasRepository);

  const productosActivos = productos.filter((p) => p.activo);
  const platoBajo = productosActivos.filter(
    (p) => p.stockActual <= p.stockMinimo,
  );

  return (
    <>
      <ShellHeader
        title="Stock"
        subtitle={`${productosActivos.length} platos · ${platoBajo.length} por reponer`}
        right={
          <ButtonLink href="/productos" size="sm">
            <Plus className="size-3.5" />
            Nuevo
          </ButtonLink>
        }
      />

      <main className="mx-auto max-w-6xl px-4 py-3 space-y-3">
        {platoBajo.length > 0 ? (
          <CollapsibleSection
            title="Platos por reponer"
            count={platoBajo.length}
            variant="warning"
            defaultOpen
          >
            {platoBajo.map((p) => (
              <PlatoCard key={p.id} producto={p} showStock />
            ))}
          </CollapsibleSection>
        ) : null}

        {categorias
          .filter((c) => c.activo)
          .map((cat) => {
            const items = productosActivos.filter(
              (p) => p.categoriaId === cat.id,
            );
            if (items.length === 0) return null;
            return (
              <CollapsibleSection
                key={cat.id}
                title={cat.nombre}
                count={items.length}
                emoji={cat.emoji}
              >
                {items.map((p) => (
                  <PlatoCard key={p.id} producto={p} showStock />
                ))}
              </CollapsibleSection>
            );
          })}
      </main>
    </>
  );
}