CREATE TYPE "public"."canal_pedido" AS ENUM('whatsapp', 'presencial', 'telefono');--> statement-breakpoint
CREATE TYPE "public"."categoria_gasto" AS ENUM('insumos', 'servicios', 'sueldos', 'alquiler', 'servicios_publicos', 'transporte', 'marketing', 'otros');--> statement-breakpoint
CREATE TYPE "public"."color_plato" AS ENUM('red', 'green', 'purple', 'yellow', 'orange', 'amber', 'pink', 'blue', 'beige', 'gray', 'teal', 'rose');--> statement-breakpoint
CREATE TYPE "public"."estado_pedido" AS ENUM('pendiente', 'preparando', 'listo', 'entregado', 'cancelado');--> statement-breakpoint
CREATE TYPE "public"."tipo_entrega" AS ENUM('retiro', 'delivery');--> statement-breakpoint
CREATE TYPE "public"."tipo_movimiento_stock" AS ENUM('entrada', 'salida', 'ajuste', 'merma', 'venta');--> statement-breakpoint
CREATE TYPE "public"."unidad_medida" AS ENUM('kg', 'g', 'l', 'ml', 'unidad', 'paquete');--> statement-breakpoint
CREATE TABLE "categorias" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"emoji" text,
	"color_default" "color_plato" NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cierres_diarios" (
	"id" text PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"total_ventas" numeric(10, 2) NOT NULL,
	"cantidad_pedidos" integer NOT NULL,
	"total_gastos" numeric(10, 2) NOT NULL,
	"balance" numeric(10, 2) NOT NULL,
	"notas" text,
	"enviado_email" boolean DEFAULT false NOT NULL,
	"enviado_wsp" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"telefono" text NOT NULL,
	"direccion" text,
	"email" text,
	"notas" text,
	"total_pedidos" integer DEFAULT 0 NOT NULL,
	"ultima_compra" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gastos" (
	"id" text PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"categoria" "categoria_gasto" NOT NULL,
	"monto" numeric(10, 2) NOT NULL,
	"descripcion" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ingredientes" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"unidad" "unidad_medida" NOT NULL,
	"stock_actual" numeric(10, 3) DEFAULT '0' NOT NULL,
	"stock_minimo" numeric(10, 3) DEFAULT '0' NOT NULL,
	"costo_unitario" numeric(10, 2),
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movimientos_stock" (
	"id" text PRIMARY KEY NOT NULL,
	"ingrediente_id" text NOT NULL,
	"tipo" "tipo_movimiento_stock" NOT NULL,
	"cantidad" numeric(10, 3) NOT NULL,
	"motivo" text,
	"pedido_id" text,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedido_items" (
	"id" text PRIMARY KEY NOT NULL,
	"pedido_id" text NOT NULL,
	"producto_id" text,
	"nombre_producto" text NOT NULL,
	"color_producto" "color_plato" NOT NULL,
	"cantidad" integer NOT NULL,
	"precio_unitario" numeric(10, 2) NOT NULL,
	"subtotal" numeric(10, 2) NOT NULL,
	"imagen_producto" text,
	"observaciones" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pedidos" (
	"id" text PRIMARY KEY NOT NULL,
	"numero" integer NOT NULL,
	"cliente_id" text,
	"nombre_cliente" text NOT NULL,
	"telefono_cliente" text,
	"direccion_entrega" text,
	"subtotal" numeric(10, 2) NOT NULL,
	"envio" numeric(10, 2),
	"total" numeric(10, 2) NOT NULL,
	"estado" "estado_pedido" DEFAULT 'pendiente' NOT NULL,
	"canal" "canal_pedido" NOT NULL,
	"tipo_entrega" "tipo_entrega" NOT NULL,
	"observaciones" text,
	"fecha" date NOT NULL,
	"hora" text NOT NULL,
	"cerrado_at" timestamp with time zone,
	"entregado_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "productos" (
	"id" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text,
	"categoria_id" text NOT NULL,
	"precio" numeric(10, 2) NOT NULL,
	"color" "color_plato" NOT NULL,
	"emoji" text,
	"imagen" text,
	"stock_actual" integer DEFAULT 0 NOT NULL,
	"stock_minimo" integer DEFAULT 0 NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recetas" (
	"id" text PRIMARY KEY NOT NULL,
	"producto_id" text NOT NULL,
	"ingrediente_id" text NOT NULL,
	"cantidad" numeric(10, 3) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_ingrediente_id_ingredientes_id_fk" FOREIGN KEY ("ingrediente_id") REFERENCES "public"."ingredientes"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movimientos_stock" ADD CONSTRAINT "movimientos_stock_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_pedido_id_pedidos_id_fk" FOREIGN KEY ("pedido_id") REFERENCES "public"."pedidos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedido_items" ADD CONSTRAINT "pedido_items_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_categorias_id_fk" FOREIGN KEY ("categoria_id") REFERENCES "public"."categorias"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_producto_id_productos_id_fk" FOREIGN KEY ("producto_id") REFERENCES "public"."productos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recetas" ADD CONSTRAINT "recetas_ingrediente_id_ingredientes_id_fk" FOREIGN KEY ("ingrediente_id") REFERENCES "public"."ingredientes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "cierres_fecha_unq" ON "cierres_diarios" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "gastos_fecha_idx" ON "gastos" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "mov_stock_ingrediente_idx" ON "movimientos_stock" USING btree ("ingrediente_id");--> statement-breakpoint
CREATE INDEX "mov_stock_fecha_idx" ON "movimientos_stock" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "pedido_items_pedido_idx" ON "pedido_items" USING btree ("pedido_id");--> statement-breakpoint
CREATE INDEX "pedido_items_producto_idx" ON "pedido_items" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "pedidos_fecha_idx" ON "pedidos" USING btree ("fecha");--> statement-breakpoint
CREATE INDEX "pedidos_estado_idx" ON "pedidos" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "pedidos_cliente_idx" ON "pedidos" USING btree ("cliente_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pedidos_numero_unq" ON "pedidos" USING btree ("numero");--> statement-breakpoint
CREATE INDEX "productos_categoria_idx" ON "productos" USING btree ("categoria_id");--> statement-breakpoint
CREATE INDEX "productos_activo_idx" ON "productos" USING btree ("activo");--> statement-breakpoint
CREATE UNIQUE INDEX "recetas_unq" ON "recetas" USING btree ("producto_id","ingrediente_id");--> statement-breakpoint
CREATE INDEX "recetas_producto_idx" ON "recetas" USING btree ("producto_id");--> statement-breakpoint
CREATE INDEX "recetas_ingrediente_idx" ON "recetas" USING btree ("ingrediente_id");