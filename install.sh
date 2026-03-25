#!/bin/bash
cd /home/sona/Desktop/iw2n
npm install --legacy-peer-deps
echo "Install exit code: $?"
npx prisma generate
echo "Prisma generate exit code: $?"
