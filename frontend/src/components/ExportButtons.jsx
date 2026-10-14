import React, { useState } from 'react';
import { FileSpreadsheet, FileText, Loader2, Download } from 'lucide-react';
import { exportToExcel, exportToPDF, downloadBlob } from '../utils/exportUtils';
import api from '../services/api_principal';
import usuarioAPI from '../services/api_usuario';
import { puedeExportar } from '../utils/roles';
import Swal from 'sweetalert2';

/**
 * Botones de exportación PDF / Excel reutilizables.
 *
 * Props:
 * - data: array de objetos a exportar (vista actual)
 * - columns: [{ key, label }]
 * - title: título del reporte
 * - fileName: nombre base del archivo
 * - moduloApi: id del módulo en /api/export/:modulo (opcional, exporta desde servidor)
 * - darkMode: boolean
 * - className: clases extra
 */
const ExportButtons = ({
  data = [],
  columns,
  title = 'Reporte',
  fileName = 'reporte',
  moduloApi = null,
  darkMode = false,
  className = '',
  compact = false
}) => {
  const [loading, setLoading] = useState(null);

  if (!puedeExportar(usuarioAPI.getCurrentUser())) {
    return null;
  }

  const handleLocal = async (formato) => {
    if (!data?.length) {
      Swal.fire({
        icon: 'info',
        title: 'Sin datos',
        text: 'No hay registros para exportar.',
        confirmButtonColor: '#2A9D8F'
      });
      return;
    }

    try {
      setLoading(formato);
      if (formato === 'excel') {
        await exportToExcel({ data, columns, fileName, sheetName: title, title });
      } else {
        await exportToPDF({ data, columns, title, fileName });
      }
    } catch (error) {
      console.error('Error exportando:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'No se pudo exportar',
        confirmButtonColor: '#2A9D8F'
      });
    } finally {
      setLoading(null);
    }
  };

  const handleServer = async (formato) => {
    if (!moduloApi) return handleLocal(formato);

    try {
      setLoading(formato);
      const response = await api.get(`/export/${moduloApi}`, {
        params: { formato },
        responseType: 'blob',
        timeout: 60000
      });

      const ext = formato === 'pdf' ? 'pdf' : 'xlsx';
      const mime =
        formato === 'pdf'
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

      // Si el servidor devolvió JSON de error dentro de un blob
      if (response.data?.type === 'application/json') {
        const text = await response.data.text();
        const json = JSON.parse(text);
        throw new Error(json.error || 'Error al exportar');
      }

      downloadBlob(
        new Blob([response.data], { type: mime }),
        `${fileName}_${new Date().toISOString().slice(0, 10)}.${ext}`
      );
    } catch (error) {
      console.warn('Export servidor falló, usando local:', error.message);
      // Fallback a exportación local si hay datos
      if (data?.length) {
        await handleLocal(formato);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al exportar',
          text: error.response?.data?.error || error.message || 'No se pudo exportar',
          confirmButtonColor: '#2A9D8F'
        });
      }
    } finally {
      setLoading(null);
    }
  };

  const btnBase = compact
    ? 'px-2.5 py-1.5 text-xs rounded-md flex items-center gap-1.5 transition-colors disabled:opacity-50'
    : 'px-3 py-2 text-sm rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50';

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => handleServer('excel')}
        disabled={!!loading}
        className={`${btnBase} ${
          darkMode
            ? 'bg-emerald-700 hover:bg-emerald-600 text-white'
            : 'bg-emerald-600 hover:bg-emerald-700 text-white'
        }`}
        title="Exportar a Excel"
      >
        {loading === 'excel' ? <Loader2 size={16} className="animate-spin" /> : <FileSpreadsheet size={16} />}
        Excel
      </button>
      <button
        type="button"
        onClick={() => handleServer('pdf')}
        disabled={!!loading}
        className={`${btnBase} ${
          darkMode
            ? 'bg-rose-700 hover:bg-rose-600 text-white'
            : 'bg-rose-600 hover:bg-rose-700 text-white'
        }`}
        title="Exportar a PDF"
      >
        {loading === 'pdf' ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
        PDF
      </button>
      {moduloApi && (
        <span className="sr-only">
          <Download size={14} />
        </span>
      )}
    </div>
  );
};

export default ExportButtons;
