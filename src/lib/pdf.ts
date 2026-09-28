import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";

export async function downloadHtmlAsPdf(html: string, filename: string) {
  const toastId = toast.loading("Generating PDF...");
  
  try {
    const iframe = document.createElement("iframe");
    iframe.style.position = "absolute";
    iframe.style.left = "-9999px";
    iframe.style.width = "1122px"; // A4 landscape width
    iframe.style.height = "794px"; // A4 landscape height
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      throw new Error("Could not create iframe document");
    }

    doc.open();
    doc.write(html);
    doc.close();

    // Wait for styles and layout to apply
    await new Promise((resolve) => setTimeout(resolve, 800));

    // We target the .page element if it exists, otherwise the body
    const targetEl = doc.querySelector(".page") || doc.body;

    const canvas = await html2canvas(targetEl as HTMLElement, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    
    // jsPDF landscape A4 is roughly 842 x 595 pt
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    });

    // We can calculate the scaled dimensions to fit the page
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // The canvas dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    
    // Scale height based on width fitting exactly
    const ratio = canvasHeight / canvasWidth;
    let finalHeight = pdfWidth * ratio;
    
    // If it's too tall, it will just get cut off, which is expected for 1-page receipts.
    // If we wanted multi-page, we'd slice the canvas.

    pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, finalHeight);
    pdf.save(filename);

    document.body.removeChild(iframe);
    toast.success("PDF downloaded successfully", { id: toastId });
  } catch (err) {
    console.error("PDF generation failed:", err);
    toast.error("Failed to generate PDF. Falling back to print dialog.", { id: toastId });
    // Fallback: trigger standard print dialog if jsPDF fails
    const fallbackIframe = document.createElement("iframe");
    fallbackIframe.style.display = "none";
    document.body.appendChild(fallbackIframe);
    fallbackIframe.contentDocument?.write(html);
    fallbackIframe.contentDocument?.close();
    setTimeout(() => {
      fallbackIframe.contentWindow?.print();
      setTimeout(() => document.body.removeChild(fallbackIframe), 2000);
    }, 500);
  }
}
