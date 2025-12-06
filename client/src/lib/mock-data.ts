
export const mockFramework = {
  title: "The Last Echo",
  premise: "In a world where sound has become a lethal weapon, a deaf musician discovers a recording that could save humanity or destroy it completely. Hunted by sound-sensitive creatures and a government that wants to weaponize her disability, she must navigate a silent apocalypse to broadcast the antidote frequency.",
  hook: "Silence is survival, but the truth screams.",
  genre: "Sci-Fi Thriller",
  tone: "Tense, Atmospheric, Gritty",
  setting: {
    location: "Neo-Seattle (Ruins)",
    time: "2089 AD",
    weather: "Perpetual Rain / Fog",
    atmosphere: "Cyberpunk decay, silent streets, neon reflections in puddles"
  },
  characters: [
    {
      name: "Elara Vance",
      age: 28,
      role: "Protagonist",
      description: "Deaf musician, resourceful, haunted eyes.",
      actor: "Florence Pugh style"
    },
    {
      name: "Kaelen",
      age: 35,
      role: "Antagonist",
      description: "Sound engineer turned warlord, meticulous, cold.",
      actor: "Cillian Murphy style"
    }
  ]
};

export const mockChapters = Array.from({ length: 5 }).map((_, i) => ({
  id: i + 1,
  title: `Chapter ${i + 1}: ${["The Silence Breaks", "Echoes in the Dark", "The Frequency", "Hunted", "Resonance"][i]}`,
  summary: "Elara navigates the ruins of the old concert hall, searching for the equipment she needs while avoiding the sound-hunters.",
  status: i === 0 ? "completed" : "pending",
  duration: "00:45"
}));
