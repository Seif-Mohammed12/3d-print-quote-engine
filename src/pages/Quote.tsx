import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileType, Weight, Clock, DollarSign, Download, ShoppingCart, RotateCcw } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import ModelViewer from "@/components/ModelViewer";
import { parseSTL, type STLResult } from "@/lib/stl-parser";
import { calculateQuote, MATERIALS, type Quality, type QuoteResult } from "@/lib/quote-calculator";
import { toast } from "sonner";

const Quote = () => {
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null);
  const [fileName, setFileName] = useState("");
  const [stlResult, setStlResult] = useState<STLResult | null>(null);
  const [materialIdx, setMaterialIdx] = useState(0);
  const [quality, setQuality] = useState<Quality>("standard");
  const [infill, setInfill] = useState(20);
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const processFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (ext !== "stl" && ext !== "obj") {
      toast.error("Please upload an STL or OBJ file");
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const buffer = e.target?.result as ArrayBuffer;
      try {
        const result = parseSTL(buffer);
        setFileBuffer(buffer);
        setStlResult(result);
        setQuote(null);
        toast.success("Model loaded successfully!");
      } catch {
        toast.error("Failed to parse the file. Ensure it's a valid STL.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, [processFile]);

  const handleCalculate = () => {
    if (!stlResult) return;
    const result = calculateQuote(stlResult.volume, MATERIALS[materialIdx], quality, infill);
    setQuote(result);
  };

  const handleReset = () => {
    setFileBuffer(null);
    setFileName("");
    setStlResult(null);
    setQuote(null);
  };

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-6xl">
          <SectionHeading
            title="Smart Quote"
            subtitle="Upload your 3D model, configure options, and get an instant price."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Upload & Preview */}
            <div className="space-y-6">
              {!fileBuffer ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  className={`glass-card border-2 border-dashed p-12 text-center cursor-pointer transition-all duration-300 ${
                    dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".stl,.obj";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) processFile(file);
                    };
                    input.click();
                  }}
                >
                  <Upload className="w-12 h-12 text-primary/50 mx-auto mb-4" />
                  <h3 className="font-heading font-semibold text-foreground mb-2">
                    Drop your 3D file here
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Supports STL and OBJ files
                  </p>
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 text-sm">
                      <FileType className="w-4 h-4 text-primary" />
                      <span className="text-foreground font-medium">{fileName}</span>
                    </div>
                    <button onClick={handleReset} className="text-muted-foreground hover:text-foreground transition-colors">
                      <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                  <ModelViewer fileBuffer={fileBuffer} />
                  {stlResult && (
                    <div className="grid grid-cols-3 gap-3 mt-4">
                      {[
                        { label: "Volume", value: `${stlResult.volume.toFixed(2)} cm³` },
                        { label: "Triangles", value: stlResult.triangleCount.toLocaleString() },
                        { label: "Size", value: `${stlResult.boundingBox.x.toFixed(0)}×${stlResult.boundingBox.y.toFixed(0)}×${stlResult.boundingBox.z.toFixed(0)}mm` },
                      ].map((s) => (
                        <div key={s.label} className="glass-card p-3 text-center">
                          <span className="text-xs text-muted-foreground">{s.label}</span>
                          <p className="text-sm font-semibold text-foreground mt-0.5">{s.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Right: Configuration */}
            <div className="space-y-6">
              <div className="glass-card p-6 space-y-6">
                <h3 className="font-heading font-semibold text-foreground">Configure Your Print</h3>

                {/* Material */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Material</label>
                  <div className="grid grid-cols-2 gap-2">
                    {MATERIALS.map((m, i) => (
                      <button
                        key={m.name}
                        onClick={() => { setMaterialIdx(i); setQuote(null); }}
                        className={`p-3 rounded-lg text-center text-sm transition-all ${
                          materialIdx === i
                            ? "bg-primary/15 border border-primary/50 text-foreground"
                            : "bg-secondary border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className={`font-semibold ${m.color}`}>{m.name}</span>
                        <span className="block text-xs mt-0.5">EGP{m.costPerGram}/g</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quality */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 block">Quality</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["draft", "standard", "high"] as Quality[]).map((q) => (
                      <button
                        key={q}
                        onClick={() => { setQuality(q); setQuote(null); }}
                        className={`p-3 rounded-lg text-sm capitalize transition-all ${
                          quality === q
                            ? "bg-primary/15 border border-primary/50 text-foreground"
                            : "bg-secondary border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Infill */}
                <div>
                  <label className="text-sm font-medium text-foreground mb-2 flex justify-between">
                    Infill <span className="text-primary">{infill}%</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    step={5}
                    value={infill}
                    onChange={(e) => { setInfill(Number(e.target.value)); setQuote(null); }}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>5%</span><span>50%</span><span>100%</span>
                  </div>
                </div>

                <button
                  onClick={handleCalculate}
                  disabled={!stlResult}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Calculate Quote
                </button>
              </div>

              {/* Quote Result */}
              <AnimatePresence>
                {quote && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="glass-card neon-border p-6"
                  >
                    <div className="text-center mb-6">
                      <span className="text-sm text-muted-foreground">Estimated Price</span>
                      <p className="text-4xl font-heading font-bold neon-text mt-1">
                        EGP{quote.totalPrice.toFixed(2)}
                      </p>
                    </div>

                    <div className="space-y-3 mb-6">
                      {[
                        { icon: Weight, label: "Weight", value: `${quote.weightGrams.toFixed(1)}g` },
                        { icon: Clock, label: "Print Time", value: quote.estimatedTime },
                        { icon: DollarSign, label: "Material Cost", value: `EGP${quote.materialCost.toFixed(2)}` },
                        { icon: Clock, label: "Time Cost", value: `EGP${quote.timeCost.toFixed(2)}` },
                      ].map((row) => (
                        <div key={row.label} className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <row.icon className="w-3.5 h-3.5" /> {row.label}
                          </span>
                          <span className="text-foreground font-medium">{row.value}</span>
                        </div>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground text-center mb-4 leading-relaxed">
                      * This is an approximate estimate. Final pricing may vary after we review your file. We will contact you to confirm the details before proceeding.
                    </p>

                    <div className="flex gap-3">
                      <button className="flex-1 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)] transition-all flex items-center justify-center gap-2">
                        <ShoppingCart className="w-4 h-4" /> Order Now
                      </button>
                      <button className="py-2.5 px-4 rounded-lg border border-border text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center gap-2">
                        <Download className="w-4 h-4" /> PDF
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Quote;
