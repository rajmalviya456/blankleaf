import { detectLanguage } from './detectLanguage'

const cases: [string, string][] = [
  ['json', '{\n  "name": "blankleaf",\n  "version": 1\n}'],
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
  ['ruby', "require 'json'\n\nclass Greeter\n  def initialize(name)\n    @name = name\n  end\nend"],
  ['ruby', 'def greet(name)\n  puts "Hello, #{name}"\nend\n\ngreet("Ann")'],
  ['ruby', '[1, 2, 3].each do |n|\n  puts n * 2\nend'],
  ['ruby', "Rails.application.routes.draw do\n  resources :users\n  root to: 'home#index'\nend"],
  [
    'csharp',
    'using System;\n\nnamespace Demo\n{\n    public class Hi\n    {\n        static void Main() { Console.WriteLine("hi"); }\n    }\n}',
  ],
  ['kotlin', 'fun main() {\n    val name = "Ann"\n    println("Hi $name")\n}'],
  [
    'swift',
    'import SwiftUI\n\nstruct ContentView: View {\n    var body: some View { Text("Hi") }\n}',
  ],
  [
    'lua',
    'local function greet(name)\n  print("Hi " .. name)\nend\n\nfor i = 1, 3 do\n  greet(i)\nend',
  ],
  ['perl', '#!/usr/bin/perl\nuse strict;\nuse warnings;\nmy $name = "Ann";\nprint "Hi $name\\n";'],
  ['powershell', 'param([string]$Name)\n$files = Get-ChildItem -Path .\nWrite-Host "Hi $Name"'],
  ['r', 'library(ggplot2)\ndata <- read.csv("x.csv")\nsummary(data)'],
  [
    'nginx',
    'server {\n    listen 80;\n    server_name example.com;\n    location / {\n        proxy_pass http://app;\n    }\n}',
  ],
  ['ini', 'DATABASE_URL=postgres://localhost/db\nPORT=3000\nDEBUG=true'],
  [
    'scss',
    '$brand: #c00;\n\n.btn {\n  color: $brand;\n  &:hover {\n    color: darken($brand, 10%);\n  }\n}',
  ],
  ['less', '@brand: #c00;\n\n.btn {\n  color: @brand;\n  .mixin();\n}'],
  ['java', 'public class Hello {\n  public static void main(String[] args) {}\n}'],
  ['cpp', '#include <iostream>\nint main() { std::cout << "hi"; }'],
  ['typescript', 'interface User {\n  id: string\n  age: number\n}'],
  ['typescript', 'const n: number = 4\nfunction f(a: string): void {}'],
  ['javascript', 'const x = 1\nfunction add(a, b) {\n  return a + b\n}'],
  ['javascript', "import React from 'react'\nexport default () => null"],
  ['css', '.btn {\n  color: red;\n  padding: 4px 8px;\n}'],
  ['toml', '[package]\nname = "blankleaf"\nversion = "0.1.0"'],
  ['yaml', 'name: ci\non:\n  push:\n    branches: [main]\njobs:\n  build:\n    runs-on: ubuntu'],
  ['markdown', '# Sprint sync\n\n- ship tabs\n- fix export\n\n**blocker:** none'],
  [
    'markdown',
    '# Sprint sync\n\nShip **tabs** and `export`.\n\n- [x] tabs\n\n```js\nconst x = 1\n```\n',
  ],
  ['markdown', 'Notes\n\n```python\nimport os\nprint(1)\n```'],
  ['yaml', '# deploy config\nservices:\n  - web\n  - db\nregion: eu\nreplicas: 2'],
  ['plaintext', 'Meeting went fine. Need to call Sam tomorrow about the budget.'],
  ['plaintext', ''],
  // Prose that looks like code at a glance.
  ['plaintext', 'Name: Bob Smith\nPhone: 555 0100\nNotes: call back after lunch'],
  ['plaintext', 'Select a vendor from the shortlist by Friday.'],
  ['plaintext', 'Rooms to do: kitchen => paint, hall => tiles'],
  // Code that used to be misread.
  ['python', 'import os\n\nconfig = {\n    "debug": True,\n}\n\ndef main():\n    print(config)\n'],
  [
    'javascript',
    'import React from \'react\'\n\nexport function App() {\n  return <div className="app">Hi</div>\n}',
  ],
  ['markdown', '# Links\n\nSee <a href="https://x.dev">the docs</a> and **this**.\n\n- one\n- two'],
  ['cpp', '#include <vector>\n\nclass Stack {\npublic:\n  void push(int v);\n};'],
  ['sql', 'SELECT id,\n       name\nFROM users\nWHERE active = 1;'],
  ['dockerfile', '# syntax=docker/dockerfile:1\nFROM node:24\nRUN npm ci'],
]

describe('detectLanguage', () => {
  it.each(cases)('detects %s', (expected, text) => {
    expect(detectLanguage(text)).toBe(expected)
  })

  it('only inspects the first 4KB', () => {
    expect(detectLanguage('plain words here\n'.repeat(400) + '{"late": "json"}')).toBe('plaintext')
  })
})
