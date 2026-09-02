import { isAiConfigured } from "@/lib/ai/provider";
import { AssistantChat } from "@/components/assistant/assistant-chat";

export const metadata = { title: "Assistant IA" };

export default async function AssistantPage() {
  const aiConfigured = await isAiConfigured();

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold text-foreground">Assistant IA</h1>
        <p className="text-sm text-muted-foreground">
          Connaît ton profil et tes opportunités — pose-lui une question sur ta recherche.
        </p>
      </div>
      <AssistantChat aiConfigured={aiConfigured} />
    </div>
  );
}
