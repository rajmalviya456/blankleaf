import { detectLanguage } from './detectLanguage'

const cases: [string, string][] = [
  ['json', '{\n  "name": "notepadz",\n  "version": 1\n}'],
  ['json', '[1, 2, {"a": true}]'],
  [
    'log',
    '2026-11-16 12:01:03 INFO boot ok\n2026-11-16 12:01:09 WARN slow query 812ms\n2026-11-16 12:02:44 ERROR ECONNRESET',
  ],
  ['log', '[12:01:03] INFO started\n[12:01:04] DEBUG cfg loaded\n[12:01:05] ERROR failed to bind'],
  ['html', '<!doctype html>\n<html><body><div>hi</div></body></html>'],
  ['xml', '<?xml version="1.0"?>\n<root><item id="1"/></root>'],
  ['php', '<?php\necho "hi";'],
  ['shell', '#!/usr/bin/env bash\nset -euo pipefail\necho done'],
  ['shell', '$ npm install\n$ npm run build\n$ git push'],
  ['diff', 'diff --git a/x b/x\n--- a/x\n+++ b/x\n@@ -1 +1 @@\n-old\n+new'],
  ['dockerfile', 'FROM node:24\nWORKDIR /app\nRUN npm ci\nCMD ["npm", "start"]'],
  ['python', 'import os\n\ndef main():\n    print(os.getcwd())\n'],
  ['sql', 'SELECT id, name FROM users WHERE active = 1 ORDER BY name;'],
  ['go', 'package main\n\nimport "fmt"\n\nfunc main() {\n\tfmt.Println("hi")\n}'],
  ['rust', 'fn main() {\n    let mut x = 5;\n    println!("{}", x);\n}'],
  ['java', 'public class Hello {\n  public static void main(String[] args) {}\n}'],
  ['cpp', '#include <iostream>\nint main() { std::cout << "hi"; }'],
  ['typescript', 'interface User {\n  id: string\n  age: number\n}'],
  ['typescript', 'const n: number = 4\nfunction f(a: string): void {}'],
  ['javascript', 'const x = 1\nfunction add(a, b) {\n  return a + b\n}'],
  ['javascript', "import React from 'react'\nexport default () => null"],
  ['css', '.btn {\n  color: red;\n  padding: 4px 8px;\n}'],
  ['toml', '[package]\nname = "notepadz"\nversion = "0.1.0"'],
  ['yaml', 'name: ci\non:\n  push:\n    branches: [main]\njobs:\n  build:\n    runs-on: ubuntu'],
  ['markdown', '# Sprint sync\n\n- ship tabs\n- fix export\n\n**blocker:** none'],
  ['plaintext', 'Meeting went fine. Need to call Sam tomorrow about the budget.'],
  ['plaintext', ''],
]

describe('detectLanguage', () => {
  it.each(cases)('detects %s', (expected, text) => {
    expect(detectLanguage(text)).toBe(expected)
  })

  it('only inspects the first 4KB', () => {
    expect(detectLanguage('plain words here\n'.repeat(400) + '{"late": "json"}')).toBe('plaintext')
  })
})
