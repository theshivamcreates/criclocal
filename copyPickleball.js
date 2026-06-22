const fs = require('fs');
const path = require('path');

function processFile(src, dest) {
  let content = fs.readFileSync(src, 'utf8');
  content = content.replace(/football/g, 'pickleball');
  content = content.replace(/Football/g, 'Pickleball');
  content = content.replace(/⚽/g, '🏓');
  
  // Specific match score adaptations? We'll do that manually after.
  
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, content);
}

processFile(
  'app/dashboard/football/page.tsx', 
  'app/dashboard/pickleball/page.tsx'
);

processFile(
  'app/football/match/[matchId]/score/page.tsx', 
  'app/pickleball/match/[matchId]/score/page.tsx'
);

processFile(
  'app/football/match/[matchId]/overlay/page.tsx', 
  'app/pickleball/match/[matchId]/overlay/page.tsx'
);

processFile(
  'app/football/tournament/[tournamentId]/page.tsx', 
  'app/pickleball/tournament/[tournamentId]/page.tsx'
);

console.log('Files copied and string replaced successfully.');
