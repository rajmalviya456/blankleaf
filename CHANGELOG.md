# Changelog

## [1.18.3](https://github.com/rajmalviya456/blankleaf/compare/v1.18.2...v1.18.3) (2026-11-20)


### Bug Fixes

* **deps:** use the patched KaTeX everywhere ([#110](https://github.com/rajmalviya456/blankleaf/issues/110)) ([86134fa](https://github.com/rajmalviya456/blankleaf/commit/86134fa0907856f201b83444c9ffbba5e72d9ec6))

## [1.18.2](https://github.com/rajmalviya456/blankleaf/compare/v1.18.1...v1.18.2) (2026-11-20)


### Bug Fixes

* stop showing the old Notepadz name ([#108](https://github.com/rajmalviya456/blankleaf/issues/108)) ([97177c8](https://github.com/rajmalviya456/blankleaf/commit/97177c8d69730be2eb1f16152ca7eb6a585c151b))

## [1.18.1](https://github.com/rajmalviya456/blankleaf/compare/v1.18.0...v1.18.1) (2026-11-20)


### Bug Fixes

* note names drop a Markdown heading's # marks ([#102](https://github.com/rajmalviya456/blankleaf/issues/102)) ([9d6e20d](https://github.com/rajmalviya456/blankleaf/commit/9d6e20db5239949e9cdb0b5b5a39fd581cb28373))

## [1.18.0](https://github.com/rajmalviya456/blankleaf/compare/v1.17.0...v1.18.0) (2026-11-20)


### Features

* collapse sections in Markdown notes ([#99](https://github.com/rajmalviya456/blankleaf/issues/99)) ([83bb49f](https://github.com/rajmalviya456/blankleaf/commit/83bb49fe5b08f373e4027b886759cfbde0b8e9f7))
* remove "Format Markdown as you type" ([f266dbe](https://github.com/rajmalviya456/blankleaf/commit/f266dbe1f94cbea07e0dbebc5c60e82fdc0ae224))

## [1.17.0](https://github.com/rajmalviya456/blankleaf/compare/v1.16.0...v1.17.0) (2026-11-20)


### Features

* / menu in Markdown notes for headings, lists, checklists, tables, dividers and today's date ([e3fbac0](https://github.com/rajmalviya456/blankleaf/commit/e3fbac02fb3bc4381c188070243b2fa55d847708))
* Enter on an empty list item ends the list ([e3fbac0](https://github.com/rajmalviya456/blankleaf/commit/e3fbac02fb3bc4381c188070243b2fa55d847708))

## [1.16.0](https://github.com/rajmalviya456/blankleaf/compare/v1.15.0...v1.16.0) (2026-11-20)


### Features

* formatting shortcuts in Markdown notes (Cmd/Ctrl+B, I, E, Shift+K and more) ([8ea07cc](https://github.com/rajmalviya456/blankleaf/commit/8ea07cc8460555a7ce52e2aa62e8e846bdb2aece))
* Markdown notes look formatted while you type, with clickable checkboxes ([8ea07cc](https://github.com/rajmalviya456/blankleaf/commit/8ea07cc8460555a7ce52e2aa62e8e846bdb2aece))
* Serif and Rounded editor fonts, and a font per note ([8ea07cc](https://github.com/rajmalviya456/blankleaf/commit/8ea07cc8460555a7ce52e2aa62e8e846bdb2aece))

## [1.15.0](https://github.com/rajmalviya456/blankleaf/compare/v1.14.0...v1.15.0) (2026-11-20)


### Features

* **backup:** encrypt backups with a backup password ([d6bff09](https://github.com/rajmalviya456/blankleaf/commit/d6bff09f1b627aaa8aa1ccafb5edcf2ffe0892ec))

## [1.14.0](https://github.com/rajmalviya456/blankleaf/compare/v1.13.4...v1.14.0) (2026-11-20)


### Features

* **code:** Format code for JavaScript, TypeScript, CSS, SCSS, Less, HTML, YAML, Markdown and SQL ([14df2aa](https://github.com/rajmalviya456/blankleaf/commit/14df2aa65b60a36cd83e24bd80454b6f38d07516))
* **markdown:** Tab tidies a table and moves to the next cell ([14df2aa](https://github.com/rajmalviya456/blankleaf/commit/14df2aa65b60a36cd83e24bd80454b6f38d07516))


### Performance

* **build:** libraries in their own files, so updates download less; a size budget for startup ([14df2aa](https://github.com/rajmalviya456/blankleaf/commit/14df2aa65b60a36cd83e24bd80454b6f38d07516))

## [1.13.4](https://github.com/rajmalviya456/blankleaf/compare/v1.13.3...v1.13.4) (2026-11-20)


### Bug Fixes

* the six smaller bugs from the review ([#89](https://github.com/rajmalviya456/blankleaf/issues/89)) ([0dd8f7e](https://github.com/rajmalviya456/blankleaf/commit/0dd8f7e927af98c1ae6f992402329e6830e91891))

## [1.13.3](https://github.com/rajmalviya456/blankleaf/compare/v1.13.2...v1.13.3) (2026-11-20)


### Bug Fixes

* **voice:** keep the last words, never type twice, and type them neatly ([#87](https://github.com/rajmalviya456/blankleaf/issues/87)) ([b130cd9](https://github.com/rajmalviya456/blankleaf/commit/b130cd9c673512fdab484b0dc3ce0c8b66ca1cb4))

## [1.13.2](https://github.com/rajmalviya456/blankleaf/compare/v1.13.1...v1.13.2) (2026-11-20)


### Bug Fixes

* **backup:** keep a folder's old backup aside before offering to restore it ([da4fa3e](https://github.com/rajmalviya456/blankleaf/commit/da4fa3e0a27fc9f30fc425bcecd2795bf01338a3))
* **editor:** toolbar text size changes only the note you're in ([da4fa3e](https://github.com/rajmalviya456/blankleaf/commit/da4fa3e0a27fc9f30fc425bcecd2795bf01338a3))
* **import:** an import confirmed later never replaces newer edits; keeps pins and closes trashed tabs ([da4fa3e](https://github.com/rajmalviya456/blankleaf/commit/da4fa3e0a27fc9f30fc425bcecd2795bf01338a3))
* **links:** long first-line titles link, emoji titles stay whole, bracket titles aren't offered ([da4fa3e](https://github.com/rajmalviya456/blankleaf/commit/da4fa3e0a27fc9f30fc425bcecd2795bf01338a3))
* **lock:** a locked note never takes plain text ([da4fa3e](https://github.com/rajmalviya456/blankleaf/commit/da4fa3e0a27fc9f30fc425bcecd2795bf01338a3))
* **preview:** big previews never cut a list, details or math block apart ([da4fa3e](https://github.com/rajmalviya456/blankleaf/commit/da4fa3e0a27fc9f30fc425bcecd2795bf01338a3))
* **shortcuts:** no note shortcuts behind a dialog; search and Trash leave zen ([da4fa3e](https://github.com/rajmalviya456/blankleaf/commit/da4fa3e0a27fc9f30fc425bcecd2795bf01338a3))
* **side-by-side:** commands, preview, outline, readability and voice act on the note you're working in ([da4fa3e](https://github.com/rajmalviya456/blankleaf/commit/da4fa3e0a27fc9f30fc425bcecd2795bf01338a3))
* **store:** keep tabs, side note and closed list in step ([da4fa3e](https://github.com/rajmalviya456/blankleaf/commit/da4fa3e0a27fc9f30fc425bcecd2795bf01338a3))
* **theme:** a share link no longer resets the saved theme; the browser bar colour is right from the start ([da4fa3e](https://github.com/rajmalviya456/blankleaf/commit/da4fa3e0a27fc9f30fc425bcecd2795bf01338a3))
* **welcome:** never recreate the Welcome note for someone who already has notes ([da4fa3e](https://github.com/rajmalviya456/blankleaf/commit/da4fa3e0a27fc9f30fc425bcecd2795bf01338a3))
* **writing:** readability skips whole code blocks; outline reads Windows line endings ([da4fa3e](https://github.com/rajmalviya456/blankleaf/commit/da4fa3e0a27fc9f30fc425bcecd2795bf01338a3))

## [1.13.1](https://github.com/rajmalviya456/blankleaf/compare/v1.13.0...v1.13.1) (2026-11-19)


### Performance

* **first-visit:** paint the welcome note's opening at once ([#83](https://github.com/rajmalviya456/blankleaf/issues/83)) ([e535403](https://github.com/rajmalviya456/blankleaf/commit/e535403772abd0d210511bde02efc26d23abfbe4))

## [1.13.0](https://github.com/rajmalviya456/blankleaf/compare/v1.12.1...v1.13.0) (2026-11-19)


### Features

* **app:** shortcuts on the installed app's icon ([#76](https://github.com/rajmalviya456/blankleaf/issues/76)) ([0ce2e3d](https://github.com/rajmalviya456/blankleaf/commit/0ce2e3d00a2d7b59e8c6d6ae967c0488c9d12d51))
* **code:** a faint column ruler in code notes ([#78](https://github.com/rajmalviya456/blankleaf/issues/78)) ([10ebd79](https://github.com/rajmalviya456/blankleaf/commit/10ebd7976ad20d14a7075e21772a254f74b2916f))
* **editor:** insert symbols and emoji from a picker ([#79](https://github.com/rajmalviya456/blankleaf/issues/79)) ([20cae23](https://github.com/rajmalviya456/blankleaf/commit/20cae23f217721e77be160a457fbf2fb40c1bc36))
* **spell:** spell check in UK, Australian, Canadian English and Spanish ([#80](https://github.com/rajmalviya456/blankleaf/issues/80)) ([e21e158](https://github.com/rajmalviya456/blankleaf/commit/e21e15817a152d2122aabcd4eb88362f08f6f301))
* **writing:** readability panel ([#81](https://github.com/rajmalviya456/blankleaf/issues/81)) ([19ea451](https://github.com/rajmalviya456/blankleaf/commit/19ea4515f1c66d14d68052710286dc49dddfe78a))


### Bug Fixes

* **palette:** rank whole-word matches first ([#74](https://github.com/rajmalviya456/blankleaf/issues/74)) ([fcaa294](https://github.com/rajmalviya456/blankleaf/commit/fcaa2940fef81347676c44c7d15543ab6a4b5452))
* **status-bar:** a … menu for the settings that don't fit ([#75](https://github.com/rajmalviya456/blankleaf/issues/75)) ([f5f5b72](https://github.com/rajmalviya456/blankleaf/commit/f5f5b722ce5f14796db0c390337802045c522469))


### Performance

* **preview:** draw big previews in chunks, without freezing ([#82](https://github.com/rajmalviya456/blankleaf/issues/82)) ([ee65f92](https://github.com/rajmalviya456/blankleaf/commit/ee65f92df6290bcfca65192f4a88ddbb9b0874b5))

## [1.12.1](https://github.com/rajmalviya456/blankleaf/compare/v1.12.0...v1.12.1) (2026-11-19)


### Performance

* keep typing fast with many notes and big notes ([#72](https://github.com/rajmalviya456/blankleaf/issues/72)) ([846c102](https://github.com/rajmalviya456/blankleaf/commit/846c102ba7b4f4a4f0485d1bf9804edbea666fa5))

## [1.12.0](https://github.com/rajmalviya456/blankleaf/compare/v1.11.1...v1.12.0) (2026-11-19)


### Features

* **spell:** Blankleaf's own spell check, fast and accurate ([#70](https://github.com/rajmalviya456/blankleaf/issues/70)) ([c0ff0ff](https://github.com/rajmalviya456/blankleaf/commit/c0ff0ffaf3666d83b708ec1c9a9371ff37b96cd3))

## [1.11.1](https://github.com/rajmalviya456/blankleaf/compare/v1.11.0...v1.11.1) (2026-11-19)


### Bug Fixes

* **editor:** only the note being edited looks active ([#68](https://github.com/rajmalviya456/blankleaf/issues/68)) ([f12a072](https://github.com/rajmalviya456/blankleaf/commit/f12a07284dddd3ae4307fc156ded44c11a27855c))

## [1.11.0](https://github.com/rajmalviya456/blankleaf/compare/v1.10.1...v1.11.0) (2026-11-19)


### Features

* **zen:** laptop zen shows only the note, full screen ([#65](https://github.com/rajmalviya456/blankleaf/issues/65)) ([0fcbe9b](https://github.com/rajmalviya456/blankleaf/commit/0fcbe9b0d7fe514778ebc5aa84fae221108fdc18))


### Bug Fixes

* **backup:** don't show the backup reminder during zen mode ([798adcc](https://github.com/rajmalviya456/blankleaf/commit/798adcc418d54007d6221fbefbb783bdae637c0f))

## [1.10.1](https://github.com/rajmalviya456/blankleaf/compare/v1.10.0...v1.10.1) (2026-11-19)


### Bug Fixes

* **backup:** don't ask first-time visitors to back up the welcome note ([#63](https://github.com/rajmalviya456/blankleaf/issues/63)) ([ca3202a](https://github.com/rajmalviya456/blankleaf/commit/ca3202aa2d48c2f8c96847917b1c0c8a4d1c5251))

## [1.10.0](https://github.com/rajmalviya456/blankleaf/compare/v1.9.0...v1.10.0) (2026-11-19)


### Features

* **code:** say which format auto-detect picked, with Undo ([#59](https://github.com/rajmalviya456/blankleaf/issues/59)) ([4961c55](https://github.com/rajmalviya456/blankleaf/commit/4961c5529d19152435aef59e024e965ce3ffc120))
* **code:** underline JSON errors as you type ([#58](https://github.com/rajmalviya456/blankleaf/issues/58)) ([497fada](https://github.com/rajmalviya456/blankleaf/commit/497fada2b498575720c6bad40ad1f9147c22e604))
* **export:** download all notes as files in a .zip ([#57](https://github.com/rajmalviya456/blankleaf/issues/57)) ([9f34391](https://github.com/rajmalviya456/blankleaf/commit/9f34391c4f46cf63870c6e9cfd2a51e1a64ea5ba))
* **launch:** sample note for first-time visitors ([#55](https://github.com/rajmalviya456/blankleaf/issues/55)) ([12c6cba](https://github.com/rajmalviya456/blankleaf/commit/12c6cba42ea4cfd217ec0617959d2215ad20e53d))
* **markdown:** Outline menu to jump between headings ([#60](https://github.com/rajmalviya456/blankleaf/issues/60)) ([fbc053f](https://github.com/rajmalviya456/blankleaf/commit/fbc053fb1cf18c3910bc0c98fc08be03948f19b0))
* **notes:** compare a note with a version or another note ([#62](https://github.com/rajmalviya456/blankleaf/issues/62)) ([0785469](https://github.com/rajmalviya456/blankleaf/commit/078546900a7c9e746a4c9a5a039d005bfee629be))
* **notes:** links between notes with [[Title]], and Linked from ([#61](https://github.com/rajmalviya456/blankleaf/issues/61)) ([5bd15a5](https://github.com/rajmalviya456/blankleaf/commit/5bd15a5705be71189d0f9eeae81101e3fb8966d6))


### Bug Fixes

* **launch:** faster first paint on phones, audit fixes ([#54](https://github.com/rajmalviya456/blankleaf/issues/54)) ([dbf3a8d](https://github.com/rajmalviya456/blankleaf/commit/dbf3a8d12df4cf078dd01b1e0dcf00584f0c6e1a))

## [1.9.0](https://github.com/rajmalviya456/blankleaf/compare/v1.8.2...v1.9.0) (2026-11-19)


### Features

* **code:** editing help for code notes and more formats ([#53](https://github.com/rajmalviya456/blankleaf/issues/53)) ([ac94db2](https://github.com/rajmalviya456/blankleaf/commit/ac94db2a6b77ea03697d42f5a68dfebe1d6fed2c))
* **formats:** add Ruby ([#50](https://github.com/rajmalviya456/blankleaf/issues/50)) ([e4faa01](https://github.com/rajmalviya456/blankleaf/commit/e4faa01f41c775d3fc2959a5ad56a3ca6868b5b4))


### Bug Fixes

* **code:** auto-detect, comments, opening code files, JSON format ([#52](https://github.com/rajmalviya456/blankleaf/issues/52)) ([ba264e5](https://github.com/rajmalviya456/blankleaf/commit/ba264e5db248b0e49b73d109002686fd1802e0b3))

## [1.8.2](https://github.com/rajmalviya456/blankleaf/compare/v1.8.1...v1.8.2) (2026-11-19)


### Bug Fixes

* **editor:** Enter keeps the indent you typed in code notes ([#48](https://github.com/rajmalviya456/blankleaf/issues/48)) ([01e36ce](https://github.com/rajmalviya456/blankleaf/commit/01e36cecd36d5cdb017a51f4258e377189541c11))

## [1.8.1](https://github.com/rajmalviya456/blankleaf/compare/v1.8.0...v1.8.1) (2026-11-18)


### Bug Fixes

* **backup:** say when a browser can't back up to a folder ([#43](https://github.com/rajmalviya456/blankleaf/issues/43)) ([5f30957](https://github.com/rajmalviya456/blankleaf/commit/5f30957ba4742c27cdcf2c928502f81e5d2b3325))
* **voice:** hide voice typing where the browser can't use it ([#45](https://github.com/rajmalviya456/blankleaf/issues/45)) ([d2fb904](https://github.com/rajmalviya456/blankleaf/commit/d2fb9048357830f7a11af7ec0cadd4da8e8c58c3))

## [1.8.0](https://github.com/rajmalviya456/blankleaf/compare/v1.7.0...v1.8.0) (2026-11-18)


### Features

* **app:** voice typing in supported browsers ([214629c](https://github.com/rajmalviya456/blankleaf/commit/214629c6eb71b84fe14d717dfb1bce2068f0d084))


### Bug Fixes

* **app:** keep the blank page free of links ([214629c](https://github.com/rajmalviya456/blankleaf/commit/214629c6eb71b84fe14d717dfb1bce2068f0d084))

## [1.7.0](https://github.com/rajmalviya456/blankleaf/compare/v1.6.0...v1.7.0) (2026-11-18)


### Features

* **app:** continue the last note from the blank page ([e6509c5](https://github.com/rajmalviya456/blankleaf/commit/e6509c502422e06ad5c6a274f1f1d29ab87c3244))
* **app:** reading time and word goals ([e6509c5](https://github.com/rajmalviya456/blankleaf/commit/e6509c502422e06ad5c6a274f1f1d29ab87c3244))
* **app:** send text to Blankleaf and open text files with it ([e6509c5](https://github.com/rajmalviya456/blankleaf/commit/e6509c502422e06ad5c6a274f1f1d29ab87c3244))
* **backup:** keep a backup file updated in a chosen folder ([e6509c5](https://github.com/rajmalviya456/blankleaf/commit/e6509c502422e06ad5c6a274f1f1d29ab87c3244))


### Performance

* **app:** paint the page instantly and trim startup code ([#36](https://github.com/rajmalviya456/blankleaf/issues/36)) ([0765aed](https://github.com/rajmalviya456/blankleaf/commit/0765aed995fb495c969d8917b9023c005e583c28))

## [1.6.0](https://github.com/rajmalviya456/blankleaf/compare/v1.5.1...v1.6.0) (2026-11-18)


### Features

* **app:** open on a blank page every visit ([#34](https://github.com/rajmalviya456/blankleaf/issues/34)) ([30e6810](https://github.com/rajmalviya456/blankleaf/commit/30e68103afb68d952ab85dd83a2e89cea85d03d1))

## [1.5.1](https://github.com/rajmalviya456/blankleaf/compare/v1.5.0...v1.5.1) (2026-11-18)


### Bug Fixes

* **find:** make the Replace field match the Find field ([#32](https://github.com/rajmalviya456/blankleaf/issues/32)) ([d6454e1](https://github.com/rajmalviya456/blankleaf/commit/d6454e115a1a4bfc775de472e903b059d3cca3ae))

## [1.5.0](https://github.com/rajmalviya456/blankleaf/compare/v1.4.0...v1.5.0) (2026-11-18)


### Features

* export to HTML and Word, version history in backups ([#27](https://github.com/rajmalviya456/blankleaf/issues/27)) ([4c98cd6](https://github.com/rajmalviya456/blankleaf/commit/4c98cd6c8be151e6f7885671d710b4d9cb8c85b4))
* **lock:** password-locked notes, with review fixes ([#30](https://github.com/rajmalviya456/blankleaf/issues/30)) ([5e06f26](https://github.com/rajmalviya456/blankleaf/commit/5e06f261166db149d53f15124f61ff0571f9d222))
* **markdown:** diagrams, math and two notes side by side ([#29](https://github.com/rajmalviya456/blankleaf/issues/29)) ([f361041](https://github.com/rajmalviya456/blankleaf/commit/f361041ac2b5ff11947eb1c17646ce81396d2779))
* print to PDF, note templates, spell check and sort options ([#26](https://github.com/rajmalviya456/blankleaf/issues/26)) ([93288cd](https://github.com/rajmalviya456/blankleaf/commit/93288cd08229ed05d26af498cb8857215f4e7b05))
* **seo:** add landing and FAQ pages ([#25](https://github.com/rajmalviya456/blankleaf/issues/25)) ([f348d76](https://github.com/rajmalviya456/blankleaf/commit/f348d76233ec237b3f1e6e57e85d1a65cd0fc1b9))
* **tags:** label notes, filter the list by tag and search tags ([#28](https://github.com/rajmalviya456/blankleaf/issues/28)) ([b995e15](https://github.com/rajmalviya456/blankleaf/commit/b995e150766e7ad8f2bec69112cd730db2fd97ac))

## [1.4.0](https://github.com/rajmalviya456/blankleaf/compare/v1.3.1...v1.4.0) (2026-11-18)


### Features

* version history, text tools and clickable checklists ([#23](https://github.com/rajmalviya456/blankleaf/issues/23)) ([d64df35](https://github.com/rajmalviya456/blankleaf/commit/d64df3516ff8fa25f9ae57a83952880f4c2f9f4d))

## [1.3.1](https://github.com/rajmalviya456/blankleaf/compare/v1.3.0...v1.3.1) (2026-11-18)


### Bug Fixes

* **pwa:** serve the sitemap and other files, not the app, once installed ([#20](https://github.com/rajmalviya456/blankleaf/issues/20)) ([d8043a5](https://github.com/rajmalviya456/blankleaf/commit/d8043a52fcf4f6686b1298194e5300e8339ca94e))

## [1.3.0](https://github.com/rajmalviya456/blankleaf/compare/v1.2.0...v1.3.0) (2026-11-18)


### Features

* rename Notepadz to Blankleaf, with full SEO ([#17](https://github.com/rajmalviya456/blankleaf/issues/17)) ([ced6ea0](https://github.com/rajmalviya456/blankleaf/commit/ced6ea057b9997a9607755d9ac32af4a1004ae72))


### Bug Fixes

* **share:** keep shared notes out of search results; verify Search Console ([#18](https://github.com/rajmalviya456/blankleaf/issues/18)) ([3bd918b](https://github.com/rajmalviya456/blankleaf/commit/3bd918b7007fe27f2ffa2f06f90bdeec1e9983be))

## [1.2.0](https://github.com/rajmalviya456/blankleaf/compare/v1.1.0...v1.2.0) (2026-11-18)


### Features

* **mobile:** phone layout with full laptop feature parity ([#4](https://github.com/rajmalviya456/blankleaf/issues/4)) ([76baf04](https://github.com/rajmalviya456/blankleaf/commit/76baf04d937a530bd05bda1d3dbf760dee22aa11))

## [1.1.0](https://github.com/rajmalviya456/blankleaf/compare/v1.0.0...v1.1.0) (2026-11-17)


### Features

* **about:** show release notes in the app ([5b7b882](https://github.com/rajmalviya456/blankleaf/commit/5b7b8826dfdb8b64560e584060e54e669d919fa6))


### Bug Fixes

* **editor:** drop the invalid label on the editor wrapper ([#3](https://github.com/rajmalviya456/blankleaf/issues/3)) ([2d574ba](https://github.com/rajmalviya456/blankleaf/commit/2d574ba68e7192a02e4f18037864004ad7b90b08))

## [1.0.0](https://github.com/rajmalviya456/blankleaf/tree/0a24e5da13ce0b10951b4d5e7e1aec6d3b717891) (2026-11-17)

First public release.

### Features

- **Full-window, tabbed notepad** with a sidebar (notes, search, trash) and zen mode. Tabs can be pinned, reordered, renamed and reopened after closing.
- **Remembers your session**: open tabs, cursor and scroll position come back after a reload, and several windows stay in sync.
- **Plain text or Markdown per note**, with edit / split / preview and highlighted code blocks in the preview.
- **Syntax highlighting for 20+ formats** (JSON, YAML, logs, diffs, JavaScript, Python, SQL, Go, Rust…), detected as you type or picked from the format menu.
- **Toolbar that fits the note**: formatting for Markdown; change case, sort / dedupe / trim lines and insert date for plain text, code and logs.
- **Share a note by link**: end-to-end encrypted, password-protected by default, expiring after 5 minutes to 7 days, sent browser to browser with no server storing it.
- **Search across all notes**, find & replace, and a trash that keeps notes for 30 days.
- **Delete notes from the list** without opening them, with Undo.
- **Backups**: export everything to one file, import it back, or drop text files onto the window.
- **Command palette** (⌘K / Ctrl+K), keyboard shortcuts sheet and an About page.
- **Light and dark themes**, accent colour, editor font, size, line numbers and tab size.
- **Works offline** and installs as an app; new versions offer a Reload instead of refreshing on their own.
