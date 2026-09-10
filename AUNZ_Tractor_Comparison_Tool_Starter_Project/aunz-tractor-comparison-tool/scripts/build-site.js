import fs from 'node:fs'; import path from 'node:path'; const root=path.resolve(import.meta.dirname,'..'); const dist=path.join(root,'dist');
fs.cpSync(path.join(root,'src'),dist,{recursive:true}); if(fs.existsSync(path.join(root,'assets'))) fs.cpSync(path.join(root,'assets'),path.join(dist,'assets'),{recursive:true}); console.log('Static site assembled in dist/.');
