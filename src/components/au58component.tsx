"use client";

import React, { useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { QRCodeCanvas } from "qrcode.react";
import { v4 as uuidv4 } from "uuid";

const SignatureQR: React.FC = () => {
    const uuid = uuidv4();
    const qrValue = `${process.env.NEXT_PUBLIC_FE_URL}/profile/${uuid}`;

    return (
        <div className="flex flex-col items-center gap-1">
            <QRCodeCanvas
                value={qrValue}
                size={90}
                level="H"
                includeMargin={false}
                imageSettings={{
                    src: "/images/logo-ptpn4.png",
                    height: 22,
                    width: 22,
                    excavate: true,
                }}
            />
            <span className="text-[8px] break-all text-center w-20">
                {uuid}
            </span>
        </div>
    );
};

const Au58Component: React.FC = () => {
    const formRef = useRef<HTMLDivElement>(null);
    const [pdfMode, setPdfMode] = useState(false);

    const downloadPDF = async () => {
        if (!formRef.current) return;

        setPdfMode(true);

        await new Promise((resolve) => setTimeout(resolve, 300));

        const canvas = await html2canvas(formRef.current, {
            scale: 3,
            useCORS: true,
            backgroundColor: "#ffffff",
        });

        const imgData = canvas.toDataURL("image/png");

        const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4",
        });

        const pageWidth = pdf.internal.pageSize.getWidth();
        const margin = 12;
        const usableWidth = pageWidth - margin * 2;
        const imgHeight = (canvas.height * usableWidth) / canvas.width;

        pdf.addImage(imgData, "PNG", margin, margin, usableWidth, imgHeight);

        pdf.save("AU58_Bon_Permintaan_Barang.pdf");

        setPdfMode(false);
    };

    const rows = Array.from({ length: 12 });

    const cellPadding = pdfMode ? "pb-3 pt-0" : "py-1";
    const headerPadding = pdfMode ? "pb-3 pt-0" : "py-2";

    return (
        <div className="p-8 min-h-screen">
            <button
                onClick={downloadPDF}
                className="mb-6 px-5 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
            >
                Download PDF
            </button>

            <div
                ref={formRef}
                className="bg-white p-6 pt-0 border border-black text-xs w-full rounded-lg"
            >
                {/* Header */}
                <div className={`flex justify-between ${headerPadding}`}>
                    <div className="font-bold">Form 8.8.</div>
                    <div className="font-bold">
                        Bon Permintaan Dan Pengeluaran Barang – AU.58
                    </div>
                </div>

                {/* Title */}
                <div
                    className={`border border-black text-center font-bold ${headerPadding}`}
                >
                    BON PERMINTAAN DAN PENGELUARAN BARANG
                </div>

                {/* Info Section */}
                <div className="grid grid-cols-2 border border-black border-t-0">
                    <div className="p-3 border-r border-black">
                        <div className="font-bold flex items-center gap-2">
                            <img
                                src="/images/logo-ptpn4.png"
                                className="w-7 h-7"
                            />
                            <span className="-mt-3">
                                PT PERKEBUNAN NUSANTARA IV
                            </span>
                        </div>

                        <div className="mt-2">
                            Kebun / Unit : KEBUN TONDUHAN
                        </div>
                        <div className="mt-2">Bagian :</div>
                    </div>

                    <div className="p-3">
                        <div className="flex justify-between">
                            <span>Nomor :</span>
                            <span className="border-b border-black w-40"></span>
                        </div>

                        <div className="flex justify-between mt-3">
                            <span>Tanggal :</span>
                            <span className="border-b border-black w-40"></span>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <table className="w-full border border-black border-t-0 text-xs">
                    <thead>
                        <tr className="bg-gray-50">
                            <th className={`border border-black px-2 ${headerPadding}`}>
                                No. Kode Barang
                            </th>
                            <th className={`border border-black px-2 ${headerPadding}`}>
                                Uraian
                            </th>
                            <th className={`border border-black px-2 ${headerPadding}`}>
                                Satuan
                            </th>
                            <th className={`border border-black px-2 ${headerPadding}`}>
                                Diminta
                            </th>
                            <th className={`border border-black px-2 ${headerPadding}`}>
                                Dikeluarkan
                            </th>
                            <th className={`border border-black px-2 ${headerPadding}`}>
                                Harga Satuan
                            </th>
                            <th className={`border border-black px-2 ${headerPadding}`}>
                                Jumlah
                            </th>
                            <th className={`border border-black px-2 ${headerPadding}`}>
                                No. Rekg / No. Perintah Kerja
                            </th>
                            <th className={`border border-black px-2 ${headerPadding}`}>
                                No. Blok
                            </th>
                            <th className={`border border-black px-2 ${headerPadding}`}>
                                Sisa Setelah Dibukukan
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {rows.map((_, index) => (
                            <tr key={index}>
                                {Array.from({ length: 10 }).map((_, i) => (
                                    <td
                                        key={i}
                                        className={`border border-black px-2 h-8 ${cellPadding}`}
                                    ></td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Barang Untuk */}
                <div className="border border-black border-t-0 p-3">
                    Barang Untuk / Dikirim Kepada :
                </div>

                {/* Footer */}
                <div className="grid grid-cols-5 border border-black border-t-0 text-center">
                    <div className="border-r border-black p-4">
                        No. Permintaan Pembelian
                    </div>

                    <div className="border-r border-black p-4 flex flex-col items-center">
                        Diminta oleh :
                        <div className="mt-2">
                            <SignatureQR />
                        </div>
                        <div className="mt-3 border-t border-black w-full"></div>
                    </div>

                    <div className="border-r border-black p-4 flex flex-col items-center">
                        Disetujui Oleh :
                        <div className="mt-2">
                            <SignatureQR />
                        </div>
                        <div className="mt-3 border-t border-black w-full"></div>
                    </div>

                    <div className="border-r border-black p-4 flex flex-col items-center">
                        Dikeluarkan oleh :
                        <div className="mt-2">
                            <SignatureQR />
                        </div>
                        <div className="mt-3 border-t border-black w-full"></div>
                    </div>

                    <div className="p-4 flex flex-col items-center">
                        Diterima Oleh :
                        <div className="mt-2">
                            <SignatureQR />
                        </div>
                        <div className="mt-3 border-t border-black w-full"></div>
                    </div>
                </div>

                <div className="mt-3 text-xs">AU.58</div>
            </div>
        </div>
    );
};

export default Au58Component;