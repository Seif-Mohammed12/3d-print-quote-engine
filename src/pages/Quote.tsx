import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Send } from "lucide-react";
import Layout from "@/components/Layout";
import SectionHeading from "@/components/SectionHeading";
import { calculateQuote, MATERIALS, type Quality } from "@/lib/quote-calculator";
import StlUploadCard from "@/components/stl/StlUploadCard";
import type { CompletedStlUpload } from "@/lib/stl-upload";

const Quote = () => {
  const navigate = useNavigate();
  const [uploadedModel, setUploadedModel] = useState<CompletedStlUpload | null>(null);
  const [materialIdx, setMaterialIdx] = useState(0);
  const [quality, setQuality] = useState<Quality>("standard");
  const [infill, setInfill] = useState(20);
  const handleUploadReady = useCallback((asset: CompletedStlUpload) => {
    setUploadedModel(asset);
  }, []);

  const handleGetQuote = () => {
    if (!uploadedModel) return;
    const result = calculateQuote(uploadedModel.stlResult.volume, MATERIALS[materialIdx], quality, infill);
    navigate("/quote-request", {
      state: {
        fileName: uploadedModel.fileName,
        fileType: uploadedModel.fileType,
        fileBuffer: uploadedModel.fileBuffer,
        upload: {
          jobId: uploadedModel.jobId,
          storagePath: uploadedModel.storagePath,
          checksum: uploadedModel.checksum,
          uploadedAt: uploadedModel.uploadedAt,
          fileSize: uploadedModel.fileSize,
        },
        settings: {
          material: MATERIALS[materialIdx].name,
          quality,
          infill,
        },
        // Kept internal for your admin email, but not shown on website.
        estimate: {
          totalPrice: result.totalPrice,
          weightGrams: result.weightGrams,
          estimatedTime: result.estimatedTime,
        },
      },
    });
  };

  const handleReset = () => {
    setUploadedModel(null);
  };

  return (
    <Layout>
      <section className="section-padding">
        <div className="container mx-auto max-w-6xl">
          <SectionHeading
            title="Smart Quote"
            subtitle="Upload your 3D model, choose settings, and send a quote request."
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left: Upload & Preview */}
            <div className="space-y-6">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <StlUploadCard onReady={handleUploadReady} onReset={handleReset} />
              </motion.div>
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
                        onClick={() => { setMaterialIdx(i); }}
                        className={`p-3 rounded-lg text-center text-sm transition-all ${
                          materialIdx === i
                            ? "bg-primary/15 border border-primary/50 text-foreground"
                            : "bg-secondary border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <span className={`font-semibold ${m.color}`}>{m.name}</span>
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
                        onClick={() => { setQuality(q); }}
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
                    onChange={(e) => { setInfill(Number(e.target.value)); }}
                    className="w-full accent-primary"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>5%</span><span>50%</span><span>100%</span>
                  </div>
                </div>

                <button
                  onClick={handleGetQuote}
                  disabled={!uploadedModel}
                  className="w-full py-3 rounded-lg bg-primary text-primary-foreground font-semibold hover:shadow-[0_0_20px_-5px_hsl(var(--neon-glow)/0.5)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="inline-flex items-center gap-2">
                    <Send className="w-4 h-4" />
                    Get Quote
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Quote;
