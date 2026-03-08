import React, { useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const Au58Component: React.FC = () => {
  const formRef = useRef<HTMLDivElement>(null);

  const downloadPDF = async () => {
    if (!formRef.current) return;

    const canvas = await html2canvas(formRef.current, {
      scale: 2,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save("AU58_Bon_Permintaan_Barang.pdf");
  };

  const rows = Array.from({ length: 12 });

  return (
    <div className="p-6 bg-gray-100 min-h-screen">
      <button
        onClick={downloadPDF}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded shadow"
      >
        Download PDF
      </button>

      <div
        ref={formRef}
        className="bg-white p-4 border border-black text-xs w-full"
      >
        {/* Header */}
        <div className="flex justify-between mb-2">
          <div className="font-bold">Form 8.8.</div>
          <div className="font-bold">
            Bon Permintaan Dan Pengeluaran Barang – AU.58
          </div>
        </div>

        {/* Title */}
        <div className="border border-black text-center font-bold py-1">
          BON PERMINTAAN DAN PENGELUARAN BARANG
        </div>

        {/* Info Section */}
        <div className="grid grid-cols-2 border border-black border-t-0">
          <div className="p-2 border-r border-black">
            <div>PT PERKEBUNAN NUSANTARA IV</div>
            <div className="mt-1">Kebun / Unit :</div>
            <div className="mt-1">Bagian :</div>
          </div>

          <div className="p-2">
            <div className="flex justify-between">
              <span>Nomor :</span>
              <span>________________</span>
            </div>

            <div className="flex justify-between mt-2">
              <span>Tanggal :</span>
              <span>________________</span>
            </div>
          </div>
        </div>

        {/* Table */}
        <table className="w-full border border-black border-t-0 text-xs">
          <thead>
            <tr>
              <th className="border border-black p-1">No. Kode Barang</th>
              <th className="border border-black p-1">Uraian</th>
              <th className="border border-black p-1">Satuan</th>
              <th className="border border-black p-1">Diminta</th>
              <th className="border border-black p-1">Dikeluarkan</th>
              <th className="border border-black p-1">Harga Satuan</th>
              <th className="border border-black p-1">Jumlah</th>
              <th className="border border-black p-1">
                No. Rekg / No. Perintah Kerja
              </th>
              <th className="border border-black p-1">No. Blok</th>
              <th className="border border-black p-1">Sisa Setelah Dibukukan</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((_, index) => (
              <tr key={index}>
                {Array.from({ length: 10 }).map((_, i) => (
                  <td key={i} className="border border-black h-6"></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Barang Untuk */}
        <div className="border border-black border-t-0 p-2">
          Barang Untuk / Dikirim Kepada :
        </div>

        {/* Footer */}
        <div className="grid grid-cols-5 border border-black border-t-0 text-center">
          <div className="border-r border-black p-2">
            No. Permintaan Pembelian
          </div>

          <div className="border-r border-black p-2">
            Diminta oleh :
            <div className="mt-6">....................</div>
          </div>

          <div className="border-r border-black p-2">
            Disetujui Oleh :
            <div className="mt-6">....................</div>
          </div>

          <div className="border-r border-black p-2">
            Dikeluarkan oleh :
            <div className="mt-6">....................</div>
          </div>

          <div className="p-2">
            Diterima Oleh :
            <div className="mt-6">....................</div>
          </div>
        </div>

        <div className="mt-2 text-xs">AU.58</div>
      </div>
    </div>
  );
};

export default Au58Component;