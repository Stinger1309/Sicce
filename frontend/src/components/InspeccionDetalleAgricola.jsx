import React, { useState } from "react";
import {
  X,
  Building,
  MapPin,
  Users,
  Wrench,
  DollarSign,
  Leaf,
  Droplet,
  ClipboardCheck,
  FileText,
  Shield,
  Package,
  Truck,
  Home,
  Download,
} from "lucide-react";

const fmt = (v, fallback = "—") =>
  v === null || v === undefined || v === "" ? fallback : String(v);

const money = (v) => {
  const n = parseFloat(v);
  if (Number.isNaN(n)) return "—";
  return `$${n.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const boolLabel = (v) => (v === true || v === "t" || v === 1 ? "Sí" : v === false || v === "f" || v === 0 ? "No" : "—");

const Field = ({ label, value, darkMode }) => (
  <div>
    <label className={`text-xs font-medium ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
      {label}
    </label>
    <p className={`text-sm ${darkMode ? "text-gray-200" : "text-gray-800"}`}>{fmt(value)}</p>
  </div>
);

const Section = ({ title, icon: Icon, darkMode, children }) => (
  <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
    <h4 className={`text-lg font-semibold mb-4 flex items-center gap-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
      {Icon && <Icon size={20} className="text-[#2A9D8F]" />}
      {title}
    </h4>
    {children}
  </div>
);

const Empty = ({ darkMode, text = "Sin datos registrados en esta sección" }) => (
  <div className="text-center py-10">
    <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>{text}</p>
  </div>
);

const Table = ({ columns, rows, darkMode }) => {
  if (!rows?.length) return <Empty darkMode={darkMode} />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className={darkMode ? "text-gray-400" : "text-gray-500"}>
            {columns.map((c) => (
              <th key={c.key} className={`py-2 ${c.align === "right" ? "text-right" : "text-left"}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className={`border-t ${darkMode ? "border-gray-600 text-gray-300" : "border-gray-200 text-gray-700"}`}
            >
              {columns.map((c) => (
                <td key={c.key} className={`py-2 ${c.align === "right" ? "text-right" : "text-left"}`}>
                  {c.render ? c.render(row) : fmt(row[c.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const InspeccionDetalleAgricola = ({ data, darkMode, onClose, onDownloadInforme }) => {
  const [tab, setTab] = useState("general");
  const up = data.unidad_produccion;
  const cond = data.condiciones_explotacion;
  const uso = data.uso_actual_tierra;
  const infra = data.infraestructura;
  const prod = data.produccion;
  const fin = data.financieros;
  const costos = data.costos_produccion;

  const tabs = [
    { key: "general", label: "General", icon: Building },
    { key: "unidad", label: "Unidad", icon: MapPin },
    { key: "condiciones", label: "Condiciones", icon: Users },
    { key: "uso", label: "Uso tierra", icon: Leaf },
    { key: "infra", label: "Infraestructura", icon: Home },
    { key: "produccion", label: "Producción", icon: Package },
    { key: "costos", label: "Costos/Finanzas", icon: DollarSign },
    { key: "credito", label: "Crédito", icon: Shield },
  ];

  const topo = up?.topografia_superficie;

  return (
    <div className="fixed inset-0 z-[100] overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 py-8">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
        <div
          className={`relative rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <div
            className={`sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between ${
              darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex items-center gap-3">
              <ClipboardCheck className="text-[#2A9D8F]" size={28} />
              <div>
                <h3 className={`text-xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                  Detalle de Inspección Agrícola
                </h3>
                <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  ID: {data.id_inspeccion} | Exp: {data.codigo_expediente || `EXP-${data.id_codigo_exp}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 text-xs rounded-full font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                {data.estatus_inspeccion || "Pendiente"}
              </span>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700">
                <X size={24} className={darkMode ? "text-gray-400" : "text-gray-600"} />
              </button>
            </div>
          </div>

          <div
            className={`sticky top-[73px] z-10 px-6 border-b ${
              darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
            }`}
          >
            <div className="flex gap-0 overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap ${
                    tab === t.key
                      ? "border-[#2A9D8F] text-[#2A9D8F]"
                      : darkMode
                        ? "border-transparent text-gray-400"
                        : "border-transparent text-gray-500"
                  }`}
                >
                  <t.icon size={16} />
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="px-6 py-6 space-y-6">
            {tab === "general" && (
              <>
                <Section title="Información General" icon={Building} darkMode={darkMode}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label="Emprendimiento" value={data.nombre_emprendimiento} darkMode={darkMode} />
                    <Field label="Emprendedor" value={data.nombre_emprendedor} darkMode={darkMode} />
                    <Field label="Cédula" value={data.cedula_emprendedor} darkMode={darkMode} />
                    <Field label="Sector / Actividad" value={`${fmt(data.sector)} - ${fmt(data.actividad)}`} darkMode={darkMode} />
                    <Field label="Dirección" value={data.direccion_empredimiento} darkMode={darkMode} />
                    <Field label="Teléfono / Correo" value={`${fmt(data.telefono)} | ${fmt(data.correo)}`} darkMode={darkMode} />
                    <Field label="Años de experiencia" value={data.anos_experiencia} darkMode={darkMode} />
                    <Field
                      label="Monto solicitado"
                      value={data.monto_solicitado ? money(data.monto_solicitado) : null}
                      darkMode={darkMode}
                    />
                  </div>
                </Section>
                <Section title="Datos de la inspección" icon={ClipboardCheck} darkMode={darkMode}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field label="Estatus" value={data.estatus_inspeccion} darkMode={darkMode} />
                    <Field
                      label="Fecha creación"
                      value={data.created_at ? new Date(data.created_at).toLocaleString("es-VE") : null}
                      darkMode={darkMode}
                    />
                    <Field
                      label="Última actualización"
                      value={data.updated_at ? new Date(data.updated_at).toLocaleString("es-VE") : null}
                      darkMode={darkMode}
                    />
                  </div>
                </Section>
              </>
            )}

            {tab === "unidad" && (
              up ? (
                <>
                  <Section title="Unidad de producción" icon={MapPin} darkMode={darkMode}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Ubicación práctica" value={up.ubicacion_practica} darkMode={darkMode} />
                      <Field label="Vías de acceso" value={up.vias_acceso} darkMode={darkMode} />
                      <Field label="Tenencia" value={up.tenencia} darkMode={darkMode} />
                      <Field label="Otro (tenencia)" value={up.otro_tenencia} darkMode={darkMode} />
                      <Field label="Vive en la unidad" value={boolLabel(up.vive_en_unidad_produccion)} darkMode={darkMode} />
                    </div>
                  </Section>
                  {up.linderos && (
                    <Section title="Linderos" icon={MapPin} darkMode={darkMode}>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <Field label="Norte" value={up.linderos.norte} darkMode={darkMode} />
                        <Field label="Este" value={up.linderos.este} darkMode={darkMode} />
                        <Field label="Sur" value={up.linderos.sur} darkMode={darkMode} />
                        <Field label="Oeste" value={up.linderos.oeste} darkMode={darkMode} />
                      </div>
                    </Section>
                  )}
                  {topo && (
                    <Section title="Topografía / Superficie" icon={Leaf} darkMode={darkMode}>
                      <Table
                        darkMode={darkMode}
                        columns={[
                          { key: "tipo", label: "Tipo" },
                          { key: "ha", label: "Ha", align: "right" },
                          { key: "uso", label: "Uso" },
                          { key: "obs", label: "Observaciones" },
                        ]}
                        rows={[
                          { tipo: "Planas", ha: topo.planas_ha, uso: topo.planas_uso, obs: topo.planas_observaciones },
                          { tipo: "Onduladas", ha: topo.onduladas_ha, uso: topo.onduladas_uso, obs: topo.onduladas_observaciones },
                          { tipo: "Quebradas", ha: topo.quebradas_ha, uso: topo.quebradas_uso, obs: topo.quebradas_observaciones },
                          { tipo: "Anegadizas", ha: topo.anegadizas_ha, uso: topo.anegadizas_uso, obs: topo.anegadizas_observaciones },
                        ]}
                      />
                    </Section>
                  )}
                </>
              ) : (
                <Empty darkMode={darkMode} text="No hay datos de unidad de producción" />
              )
            )}

            {tab === "condiciones" && (
              cond ? (
                <>
                  <Section title="Administración" icon={Users} darkMode={darkMode}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Field label="Tipo" value={cond.administracion?.tipo} darkMode={darkMode} />
                      <Field label="Administrador" value={cond.administracion?.nombre_administrador} darkMode={darkMode} />
                      <Field label="Experiencia (años)" value={cond.administracion?.experiencia_anos} darkMode={darkMode} />
                      <Field label="Registro físico" value={boolLabel(cond.administracion?.lleva_registro_fisico)} darkMode={darkMode} />
                      <Field label="Registro económico" value={boolLabel(cond.administracion?.lleva_registro_economico)} darkMode={darkMode} />
                      <Field label="Observaciones" value={cond.administracion?.observaciones} darkMode={darkMode} />
                    </div>
                  </Section>
                  <Section title="Personal" icon={Users} darkMode={darkMode}>
                    <Table
                      darkMode={darkMode}
                      columns={[
                        { key: "cargo", label: "Cargo" },
                        { key: "fijos", label: "Fijos", align: "right" },
                        { key: "eventuales", label: "Eventuales", align: "right" },
                        { key: "familiar", label: "Familiar", render: (r) => boolLabel(r.familiar) },
                      ]}
                      rows={cond.personal || []}
                    />
                  </Section>
                </>
              ) : (
                <Empty darkMode={darkMode} />
              )
            )}

            {tab === "uso" && (
              <div className="space-y-6">
                <Section title="Uso agrícola" icon={Leaf} darkMode={darkMode}>
                  <Table
                    darkMode={darkMode}
                    columns={[
                      { key: "cultivo", label: "Cultivo" },
                      { key: "superficie_ha", label: "Ha", align: "right" },
                    ]}
                    rows={uso?.agricultura || []}
                  />
                </Section>
                <Section title="Uso pecuario" icon={Truck} darkMode={darkMode}>
                  <Table
                    darkMode={darkMode}
                    columns={[
                      { key: "tipo", label: "Tipo" },
                      { key: "superficie_ha", label: "Ha", align: "right" },
                    ]}
                    rows={uso?.pecuario || []}
                  />
                </Section>
                <Section title="Otros usos" icon={FileText} darkMode={darkMode}>
                  <Table
                    darkMode={darkMode}
                    columns={[
                      { key: "descripcion", label: "Descripción" },
                      { key: "superficie_ha", label: "Ha", align: "right" },
                    ]}
                    rows={uso?.otros || []}
                  />
                </Section>
              </div>
            )}

            {tab === "infra" && (
              <div className="space-y-6">
                {infra ? (
                  <Section title="Infraestructura" icon={Home} darkMode={darkMode}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                      {[
                        ["vivienda", "Vivienda"],
                        ["deposito_insumos", "Depósito insumos"],
                        ["galpon", "Galpón"],
                        ["establo", "Establo"],
                        ["corral", "Corral"],
                        ["otro", "Otro"],
                      ].map(([k, label]) => (
                        <div key={k} className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${infra[k] ? "bg-green-500" : "bg-red-500"}`} />
                          <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>{label}</span>
                        </div>
                      ))}
                    </div>
                    <Field label="Otros (especificar)" value={infra.otros_especificar} darkMode={darkMode} />
                    {infra.aguas && (
                      <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-3">
                        <Field label="Pozo" value={boolLabel(infra.aguas.pozo)} darkMode={darkMode} />
                        <Field label="Riego" value={boolLabel(infra.aguas.riego)} darkMode={darkMode} />
                        <Field label="Acueducto" value={boolLabel(infra.aguas.acueducto)} darkMode={darkMode} />
                        <Field label="Río/quebrada" value={boolLabel(infra.aguas.rio_quebrada)} darkMode={darkMode} />
                        <Field label="Otro agua" value={infra.aguas.otro} darkMode={darkMode} />
                      </div>
                    )}
                  </Section>
                ) : (
                  <Empty darkMode={darkMode} text="Sin infraestructura registrada" />
                )}
                <Section title="Maquinaria y equipo" icon={Wrench} darkMode={darkMode}>
                  <Table
                    darkMode={darkMode}
                    columns={[
                      { key: "tipo", label: "Tipo" },
                      { key: "descripcion", label: "Descripción" },
                      { key: "cantidad", label: "Cant.", align: "right" },
                      { key: "estado", label: "Estado" },
                      {
                        key: "precio_unitario",
                        label: "Precio",
                        align: "right",
                        render: (r) => money(r.precio_unitario),
                      },
                    ]}
                    rows={data.maquinaria_equipo || []}
                  />
                </Section>
                {data.servicios && (
                  <Section title="Servicios" icon={Droplet} darkMode={darkMode}>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {Object.entries(data.servicios)
                        .filter(([k]) => !["id", "inspeccion_id", "created_at", "updated_at"].includes(k))
                        .map(([k, v]) => (
                          <Field key={k} label={k.replace(/_/g, " ")} value={typeof v === "boolean" ? boolLabel(v) : v} darkMode={darkMode} />
                        ))}
                    </div>
                  </Section>
                )}
                {data.practicas_agronomicas && (
                  <Section title="Prácticas agronómicas" icon={Leaf} darkMode={darkMode}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(data.practicas_agronomicas)
                        .filter(([k]) => !["id", "inspeccion_id", "created_at", "updated_at"].includes(k))
                        .map(([k, v]) => (
                          <Field key={k} label={k.replace(/_/g, " ")} value={typeof v === "boolean" ? boolLabel(v) : v} darkMode={darkMode} />
                        ))}
                    </div>
                  </Section>
                )}
              </div>
            )}

            {tab === "produccion" && (
              <div className="space-y-6">
                <Section title="Tipo de explotación" icon={Package} darkMode={darkMode}>
                  <Table
                    darkMode={darkMode}
                    columns={[
                      { key: "tipo", label: "Tipo" },
                    ]}
                    rows={prod?.tipo_explotacion || []}
                  />
                </Section>
                <Section title="Producción últimos 2 años" icon={Package} darkMode={darkMode}>
                  <Table
                    darkMode={darkMode}
                    columns={[
                      { key: "rubro", label: "Rubro" },
                      { key: "ano", label: "Año" },
                      { key: "cantidad", label: "Cantidad", align: "right" },
                      {
                        key: "valor_bs",
                        label: "Valor Bs",
                        align: "right",
                        render: (r) => fmt(r.valor_bs),
                      },
                    ]}
                    rows={prod?.produccion_ultimos_2_anos || []}
                  />
                </Section>
                {data.pastizales && (
                  <Section title="Pastizales" icon={Leaf} darkMode={darkMode}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {Object.entries(data.pastizales)
                        .filter(([k]) => !["id", "inspeccion_id", "pastos", "created_at", "updated_at"].includes(k))
                        .map(([k, v]) => (
                          <Field key={k} label={k.replace(/_/g, " ")} value={v} darkMode={darkMode} />
                        ))}
                    </div>
                    <Table
                      darkMode={darkMode}
                      columns={[
                        { key: "nombre", label: "Pasto" },
                        { key: "forma_uso", label: "Forma de uso" },
                        { key: "superficie_ha", label: "Ha", align: "right" },
                        { key: "carga_ua_ha", label: "Carga UA/Ha", align: "right" },
                      ]}
                      rows={data.pastizales.pastos || []}
                    />
                  </Section>
                )}
              </div>
            )}

            {tab === "costos" && (
              <div className="space-y-6">
                <Section title="Costos de producción" icon={DollarSign} darkMode={darkMode}>
                  {costos ? (
                    <>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        {Object.entries(costos)
                          .filter(([k]) => !["id", "inspeccion_id", "rubros", "created_at", "updated_at"].includes(k))
                          .map(([k, v]) => (
                            <Field
                              key={k}
                              label={k.replace(/_/g, " ")}
                              value={typeof v === "number" || (!Number.isNaN(parseFloat(v)) && String(v).match(/^\d/)) ? money(v) : v}
                              darkMode={darkMode}
                            />
                          ))}
                      </div>
                      <Table
                        darkMode={darkMode}
                        columns={[
                          { key: "rubro", label: "Rubro" },
                          { key: "monto", label: "Monto", align: "right", render: (r) => money(r.monto ?? r.valor ?? r.total) },
                        ]}
                        rows={costos.rubros || []}
                      />
                    </>
                  ) : (
                    <Empty darkMode={darkMode} />
                  )}
                </Section>
                <Section title="Financieros / Flujo de caja" icon={DollarSign} darkMode={darkMode}>
                  {fin?.flujo_caja ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(fin.flujo_caja)
                        .filter(([k]) => !["id", "inspeccion_id", "created_at", "updated_at"].includes(k))
                        .map(([k, v]) => (
                          <Field
                            key={k}
                            label={k.replace(/_/g, " ")}
                            value={typeof v === "number" || (!Number.isNaN(parseFloat(v)) && String(v).match(/^\d/)) ? money(v) : v}
                            darkMode={darkMode}
                          />
                        ))}
                    </div>
                  ) : (
                    <Empty darkMode={darkMode} text="Sin flujo de caja" />
                  )}
                  {fin?.rentabilidad_estatica != null && (
                    <div className="mt-4">
                      <Field label="Rentabilidad estática" value={fin.rentabilidad_estatica} darkMode={darkMode} />
                    </div>
                  )}
                </Section>
              </div>
            )}

            {tab === "credito" && (
              <div className="space-y-6">
                {data.credito ? (
                  <Section title="Crédito solicitado" icon={Shield} darkMode={darkMode}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(data.credito)
                        .filter(([k]) => !["id", "inspeccion_id", "created_at", "updated_at"].includes(k))
                        .map(([k, v]) => (
                          <Field
                            key={k}
                            label={k.replace(/_/g, " ")}
                            value={typeof v === "boolean" ? boolLabel(v) : (String(k).includes("monto") || String(k).includes("usd") ? money(v) : v)}
                            darkMode={darkMode}
                          />
                        ))}
                    </div>
                  </Section>
                ) : (
                  <Empty darkMode={darkMode} text="Sin datos de crédito" />
                )}
                {data.anexos && (
                  <Section title="Anexos" icon={FileText} darkMode={darkMode}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      {Object.entries(data.anexos)
                        .filter(([k]) => !["id", "inspeccion_id", "fotografias", "created_at", "updated_at"].includes(k))
                        .map(([k, v]) => (
                          <Field key={k} label={k.replace(/_/g, " ")} value={typeof v === "boolean" ? boolLabel(v) : v} darkMode={darkMode} />
                        ))}
                    </div>
                    {data.anexos.fotografias?.length > 0 && (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {data.anexos.fotografias.map((f, i) => (
                          <a
                            key={i}
                            href={f.foto_url || f.url || f.url_fotografia}
                            target="_blank"
                            rel="noreferrer"
                            className="block rounded overflow-hidden border border-gray-200 dark:border-gray-600"
                          >
                            <img
                              src={f.foto_url || f.url || f.url_fotografia}
                              alt={f.descripcion || `Foto ${i + 1}`}
                              className="w-full h-32 object-cover"
                            />
                          </a>
                        ))}
                      </div>
                    )}
                  </Section>
                )}
              </div>
            )}
          </div>

          <div
            className={`sticky bottom-0 px-6 py-4 border-t flex justify-end gap-3 ${
              darkMode ? "border-gray-700 bg-gray-800" : "border-gray-200 bg-white"
            }`}
          >
            {onDownloadInforme && (
              <button
                onClick={() => onDownloadInforme(data.id_inspeccion)}
                className={`px-4 py-2 rounded-lg text-sm flex items-center gap-2 ${
                  darkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                <Download size={18} />
                Descargar Informe
              </button>
            )}
            <button
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm ${
                darkMode ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspeccionDetalleAgricola;
