import { aiChat } from "@/lib/ai/provider";

export type InterviewPrepInput = {
  companyName: string;
  title: string;
  jobDescription: string | null;
  profileSummary: string;
};

const SYSTEM_PROMPT = `Tu prépares un candidat à un entretien de stage. Base-toi uniquement sur le dossier candidat réel fourni — ne lui invente jamais d'expérience, de compétence ou de résultat. Pour chaque conseil, sélectionne les expériences et projets les plus pertinents et explique brièvement le lien avec l'offre. Si une exigence n'est pas couverte, présente-la honnêtement comme un axe de préparation. Réponds en français, de façon scannable (phrases courtes, pas de pavés).

Structure ta réponse en Markdown avec exactement ces sections :
## Ce qu'il faut savoir sur le rôle
## Points de ton profil à mettre en avant
## Questions probables
## Points faibles possibles à anticiper
## Questions à poser à la fin`;

export async function generateInterviewPrep(input: InterviewPrepInput): Promise<string | null> {
  const prompt = `Entreprise : ${input.companyName}
Poste : ${input.title}
Description de l'offre : ${input.jobDescription ?? "non précisée"}
Profil du candidat : ${input.profileSummary}`;

  return aiChat(
    [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: prompt },
    ],
    { temperature: 0.4 },
  );
}
