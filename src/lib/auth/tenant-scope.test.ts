import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// `server-only` es un sentinel de Next.js que aborta el import en el
// browser. En Node (vitest) no existe como paquete resoluble.
vi.mock("server-only", () => ({}));

import { resolveTenantScope, setTenantValidator } from "./tenant-scope";

const TENANT_A = "tenant_antojos";
const TENANT_B = "tenant_test_iso";

/** Stub del validador de tenant: no toca la base de datos. */
const tenantValidator = vi.fn<(tenantId: string) => Promise<boolean>>();

let restore: (() => void) | null = null;

beforeEach(() => {
  tenantValidator.mockReset();
  tenantValidator.mockResolvedValue(true);
  const previous = setTenantValidator(tenantValidator);
  restore = () => setTenantValidator(previous);
});

afterEach(() => {
  restore?.();
  restore = null;
});

describe("resolveTenantScope", () => {
  describe("entidad sin tenant (requiresTenant = false)", () => {
    it("permite a un usuario sin tenant", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: false },
        false,
      );
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.scope.tenantId).toBeNull();
        expect(r.scope.isSuperAdmin).toBe(false);
      }
    });

    it("permite a un super admin sin tenant", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: true },
        false,
      );
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.scope.isSuperAdmin).toBe(true);
    });
  });

  describe("usuario de tenant (tenantId presente)", () => {
    it("usa el tenant de la sesión", async () => {
      const r = await resolveTenantScope(
        { tenantId: TENANT_A, isSuperAdmin: false },
        true,
      );
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.scope.tenantId).toBe(TENANT_A);
    });

    it("ignora un tenant_id distinto pedido en el body", async () => {
      const r = await resolveTenantScope(
        { tenantId: TENANT_A, isSuperAdmin: false },
        true,
        TENANT_B,
      );
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.scope.tenantId).toBe(TENANT_A);
      expect(tenantValidator).not.toHaveBeenCalled();
    });

    it("no valida contra la DB el tenant propio", async () => {
      await resolveTenantScope({ tenantId: TENANT_A, isSuperAdmin: false }, true);
      expect(tenantValidator).not.toHaveBeenCalled();
    });
  });

  describe("FALLA CERRADA — usuario sin tenant (el bug V4)", () => {
    it("rechaza con 403 la lectura", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: false },
        true,
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.response.status).toBe(403);
    });

    it("rechaza con 403 aunque se pase un tenant_id en el body", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: false },
        true,
        TENANT_B,
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.response.status).toBe(403);
      // Un usuario NO super admin no puede elegir tenant: nunca se valida.
      expect(tenantValidator).not.toHaveBeenCalled();
    });

    it("el mensaje de error es accionable", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: false },
        true,
      );
      expect(r.ok).toBe(false);
      if (!r.ok) {
        const body = await r.response.json();
        expect(String(body.error)).toMatch(/tenant/i);
      }
    });

    it("nunca devuelve ok con tenantId null cuando la entidad exige tenant", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: false },
        true,
      );
      if (r.ok) {
        // Si alguna vez pasara, el scope no debe permitir operar sin tenant.
        expect(r.scope.tenantId).not.toBeNull();
      } else {
        expect(r.response.status).toBe(403);
      }
    });
  });

  describe("super admin", () => {
    it("rechaza con 403 una ESCRITURA sin tenant_id explícito", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: true },
        true,
        null,
        "write",
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.response.status).toBe(403);
    });

    it("permite LECTURA global sin tenant_id (panel /admin)", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: true },
        true,
        null,
        "read",
      );
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.scope.tenantId).toBeNull();
        expect(r.scope.isSuperAdmin).toBe(true);
      }
    });

    it("acepta un tenant_id explícito que existe", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: true },
        true,
        TENANT_B,
      );
      expect(r.ok).toBe(true);
      if (r.ok) {
        expect(r.scope.tenantId).toBe(TENANT_B);
        expect(r.scope.isSuperAdmin).toBe(true);
      }
      expect(tenantValidator).toHaveBeenCalledWith(TENANT_B);
    });

    it("rechaza con 400 un tenant_id que no existe", async () => {
      tenantValidator.mockResolvedValue(false);
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: true },
        true,
        "tenant_inventado",
      );
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.response.status).toBe(400);
    });

    it("el super admin con tenant propio (acting as) usa ese tenant", async () => {
      const r = await resolveTenantScope(
        { tenantId: TENANT_A, isSuperAdmin: true },
        true,
        TENANT_B,
      );
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.scope.tenantId).toBe(TENANT_A);
    });

    it("en modo write, un tenant_id explícito que existe también funciona", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: true },
        true,
        TENANT_B,
        "write",
      );
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.scope.tenantId).toBe(TENANT_B);
    });
  });

  describe("el modo por defecto es lectura", () => {
    it("permite lectura global al super admin sin tenant_id", async () => {
      const r = await resolveTenantScope(
        { tenantId: null, isSuperAdmin: true },
        true,
      );
      expect(r.ok).toBe(true);
      if (r.ok) expect(r.scope.tenantId).toBeNull();
    });
  });
});
