"use client";

import { useState, useCallback } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Sparkles, Send, RefreshCw, CheckCircle, AlertTriangle } from "lucide-react";

interface EmailPreviewProps {
  lead: {
    firstName?: string | null;
    lastName?: string | null;
    fullName?: string | null;
    email: string;
    company?: string | null;
    jobTitle?: string | null;
  };
  campaign: {
    name: string;
    targetAudience?: string | null;
    valueProposition?: string | null;
    tone: string;
  };
  step: {
    stepNumber: number;
    subject: string;
    bodyTemplate: string;
  };
  senderName: string;
  onApprove?: (subject: string, body: string) => void;
  onRegenerate?: () => void;
}

/**
 * EmailPreview component with AI streaming (Ghostwriter effect)
 * Shows the email being generated word-by-word
 */
export function EmailPreview({
  lead,
  campaign,
  step,
  senderName,
  onApprove,
  onRegenerate,
}: EmailPreviewProps) {
  const [parsedEmail, setParsedEmail] = useState<{ subject: string; body: string } | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [completion, setCompletion] = useState<string>("");

  const processCompletion = useCallback((responseText: string) => {
    // Try to parse the completed response
    try {
      const cleanedText = responseText
        .replace(/```json\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      const parsed = JSON.parse(cleanedText);
      setParsedEmail({
        subject: parsed.subject || step.subject,
        body: parsed.body || step.bodyTemplate,
      });
      
      // Calculate simple confidence based on completeness
      const hasSubject = !!parsed.subject;
      const hasBody = !!parsed.body && parsed.body.length > 50;
      const noPlaceholders = !parsed.body?.includes("{{") && !parsed.subject?.includes("{{");
      
      let conf = 0.5;
      if (hasSubject) conf += 0.2;
      if (hasBody) conf += 0.2;
      if (noPlaceholders) conf += 0.1;
      setConfidence(conf);
    } catch {
      // Fallback parsing
      const subjectMatch = responseText.match(/"subject":\s*"([^"]+)"/);
      const bodyMatch = responseText.match(/"body":\s*"([^"]+)"/);
      if (subjectMatch || bodyMatch) {
        setParsedEmail({
          subject: subjectMatch?.[1] || step.subject,
          body: bodyMatch?.[1] || step.bodyTemplate,
        });
        setConfidence(0.6);
      }
    }
  }, [step.subject, step.bodyTemplate]);

  const handleGenerate = async () => {
    setParsedEmail(null);
    setConfidence(null);
    setError(null);
    setIsLoading(true);
    setCompletion("");
    
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lead, campaign, step, senderName }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to generate email: ${response.statusText}`);
      }
      
      const data = await response.json();
      setCompletion(JSON.stringify(data, null, 2));
      processCompletion(JSON.stringify(data));
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = () => {
    if (parsedEmail && onApprove) {
      onApprove(parsedEmail.subject, parsedEmail.body);
    }
  };

  const getConfidenceBadge = () => {
    if (confidence === null) return null;
    
    if (confidence >= 0.8) {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          High Confidence ({Math.round(confidence * 100)}%)
        </Badge>
      );
    }
    if (confidence >= 0.5) {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          Medium Confidence ({Math.round(confidence * 100)}%)
        </Badge>
      );
    }
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Low Confidence - Review Required
      </Badge>
    );
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-zinc-50 border-b border-zinc-200">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-amber-500" />
            AI Email Preview
          </CardTitle>
          {getConfidenceBadge()}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {!completion && !parsedEmail && !isLoading ? (
          <div className="p-8 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-zinc-300" />
            <p className="text-zinc-600 mb-4">
              Generate a personalized email for {lead.firstName || lead.email}
            </p>
            <Button onClick={handleGenerate}>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Email
            </Button>
          </div>
        ) : (
          <>
            {/* Email Preview */}
            <div className="p-4 border-b border-zinc-100">
              <div className="text-sm text-zinc-500 mb-1">To:</div>
              <div className="font-medium">{lead.email}</div>
            </div>
            
            <div className="p-4 border-b border-zinc-100">
              <div className="text-sm text-zinc-500 mb-1">Subject:</div>
              <div className="font-medium">
                {parsedEmail?.subject || (isLoading ? "Generating..." : step.subject)}
              </div>
            </div>
            
            <div className="p-4 min-h-[200px]">
              {isLoading ? (
                <div className="prose prose-sm max-w-none">
                  {/* Show streaming text with typing effect */}
                  <pre className="whitespace-pre-wrap font-sans text-zinc-700 leading-relaxed">
                    {completion}
                    <span className="animate-pulse">▋</span>
                  </pre>
                </div>
              ) : parsedEmail ? (
                <pre className="whitespace-pre-wrap font-sans text-zinc-700 leading-relaxed text-sm">
                  {parsedEmail.body}
                </pre>
              ) : (
                <p className="text-zinc-400">Email content will appear here...</p>
              )}
            </div>

            {/* Actions */}
            {parsedEmail && (
              <div className="p-4 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
                <Button variant="outline" onClick={handleGenerate} disabled={isLoading}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Regenerate
                </Button>
                <div className="flex gap-2">
                  {confidence && confidence < 0.7 && (
                    <Badge variant="warning" className="self-center">
                      Needs Review
                    </Badge>
                  )}
                  <Button onClick={handleApprove} disabled={!parsedEmail}>
                    <Send className="w-4 h-4 mr-2" />
                    Approve & Queue
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-red-50 border-t border-red-200">
                <p className="text-red-600 text-sm">
                  Error generating email: {error.message}
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
