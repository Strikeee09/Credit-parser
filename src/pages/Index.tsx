import { useState } from "react";
import { PDFUpload } from "@/components/PDFUpload";
import { ParsedResults, ParsedData } from "@/components/ParsedResults";
import { parsePDF } from "@/utils/pdfParser";
import { useToast } from "@/hooks/use-toast";
import { Loader2, FileSpreadsheet } from "lucide-react";

const Index = () => {
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = async (file: File) => {
    setIsProcessing(true);
    setFileName(file.name);
    
    try {
      toast({
        title: "Processing PDF...",
        description: "Extracting data from your credit card statement",
      });

      const data = await parsePDF(file);
      setParsedData(data);

      toast({
        title: "Success!",
        description: "Statement parsed successfully",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to parse PDF",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-4">
            <FileSpreadsheet className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Credit Card Statement Parser
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Upload your credit card statement and let our intelligent parser extract key financial data instantly
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto space-y-8">
          <PDFUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />

          {isProcessing && (
            <div className="flex items-center justify-center gap-3 p-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-muted-foreground font-medium">
                Analyzing your statement...
              </p>
            </div>
          )}

          {parsedData && !isProcessing && (
            <ParsedResults data={parsedData} fileName={fileName} />
          )}

          {/* Info Cards */}
          {!parsedData && !isProcessing && (
            <div className="grid md:grid-cols-3 gap-6 mt-12">
              <div className="p-6 rounded-lg bg-card border border-border hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-lg mb-2">Multiple Issuers</h3>
                <p className="text-sm text-muted-foreground">
                  Supports statements from American Express, Visa, Mastercard, Discover, and Chase
                </p>
              </div>
              <div className="p-6 rounded-lg bg-card border border-border hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-lg mb-2">Key Data Points</h3>
                <p className="text-sm text-muted-foreground">
                  Extracts card details, billing cycle, payment dates, balance, and transactions
                </p>
              </div>
              <div className="p-6 rounded-lg bg-card border border-border hover:shadow-md transition-shadow">
                <h3 className="font-semibold text-lg mb-2">Secure & Fast</h3>
                <p className="text-sm text-muted-foreground">
                  All processing happens locally in your browser - your data never leaves your device
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Index;
