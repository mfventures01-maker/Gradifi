# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: g4-engine-certification.spec.ts >> HOEOS G4 Engine Certification (R6) >> real engine produces stub-attributed findings and DOM faithfully renders them
- Location: e2e\g4-engine-certification.spec.ts:18:3

# Error details

```
Error: DOM mark count must equal engine finding count

expect(received).toBe(expected) // Object.is equality

Expected: 7
Received: 3
```

# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e6]:
        - button "Back to Gradifi Tools Hub" [ref=e7] [cursor=pointer]
        - heading "GRADIFI VERIFY HOEOS 2-Hour Demo Critical Path" [level=1] [ref=e10]:
          - text: GRADIFI VERIFY
          - generic [ref=e15]: HOEOS 2-Hour Demo Critical Path
        - paragraph [ref=e16]: Federated Academic Evidence Core • Deterministic Similarity Engine • Multi-Model AI Federation • Authentic Scannable QR Receipts
      - button "Pre-load Demo Document" [ref=e18] [cursor=pointer]
    - generic [ref=e24]:
      - generic [ref=e25]: 01 UPLOAD
      - generic [ref=e31]: 02 EXTRACT
      - generic [ref=e36]: 03 NORMALIZE
      - generic [ref=e42]: 04 VERIFY
      - generic [ref=e47]: 05 FEDERATE
      - generic [ref=e52]: 06 RESULT
      - generic [ref=e57]: 07 RECEIPT
    - generic [ref=e65]:
      - generic [ref=e66]:
        - generic [ref=e67]:
          - generic [ref=e68]:
            - heading "1. PDF Document Upload" [level=2] [ref=e69]
            - generic [ref=e74]: "STATUS: EXTRACTED"
          - generic [ref=e75]:
            - button "Choose File" [ref=e76] [cursor=pointer]
            - generic [ref=e77]:
              - generic [ref=e83]: Drop your document file here (.pdf, .txt, .docx, .epub, .md, .rtf, etc.)
              - generic [ref=e84]: Universal ingestion & deterministic extraction up to 15MB
          - generic [ref=e90]:
            - generic [ref=e91]: quantum_federated_learning_paper.pdf
            - generic [ref=e92]: "342 KB • Method: pdf_stream_extractor"
          - generic [ref=e96]:
            - generic [ref=e97]: Document Text Payload
            - textbox "Paste academic paper, abstract, or text payload here..." [ref=e98]: "Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks By Dr. Aris Thorne, Prof. Elena Rostova, and Dr. Marcus Vance (2024) Journal of Advanced Computer Science & Quantum Information Systems, Vol. 14, DOI: 10.1038/s41586-023-00001-x, ISBN: 978-0-123456-78-9. Abstract: Federated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. By utilizing deterministic hashing and provenance verification, our model achieves 99.4% accuracy across distributed node topology while preserving complete privacy. We compare our approach against standard Crossref and OpenAlex benchmarks. Introduction: Distributed machine learning frameworks require mathematical determinism to guarantee non-repudiation of student submissions and academic evidence. Previous work by Vance et al. demonstrated that probabilistic AI inference cannot serve as sole authority without deterministic evidence grounding."
          - button "Run Academic Evidence Verification" [ref=e99] [cursor=pointer]
        - generic [ref=e103]:
          - generic [ref=e104]:
            - heading "2. Canonical Analysis Document" [level=2] [ref=e105]
            - generic [ref=e110]: "PROVENANCE: FIXTURE"
          - generic [ref=e112]:
            - generic [ref=e113]:
              - generic [ref=e114]: Title
              - text: Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks
            - generic [ref=e115]:
              - generic [ref=e116]:
                - generic [ref=e117]: Authors
                - text: Dr. Aris Thorne, Prof. Elena Rostova, Dr. Marcus Vance (2024)
              - generic [ref=e118]:
                - generic [ref=e119]: Publication / Year
                - generic [ref=e120]: Journal of Advanced Computer Science (2024)
            - generic [ref=e121]:
              - generic [ref=e122]: Identifiers
              - generic [ref=e123]:
                - generic [ref=e124]: "DOI: 10.1038/s41586-023-00001-x"
                - generic [ref=e125]: "ISBN: 978-0-123456-78-9"
      - generic [ref=e126]:
        - generic [ref=e127]:
          - generic [ref=e128]:
            - heading "3. Google Books Evidence" [level=2] [ref=e132]
            - generic [ref=e133]: EMPTY RESULT
          - generic [ref=e135]:
            - text: "Google Books returned status:"
            - strong [ref=e138]: EMPTY RESULT
            - text: (No volume matches found).
        - generic [ref=e139]:
          - generic [ref=e140]:
            - heading "Plagiarism Evidence & Policy" [level=3] [ref=e145]
            - generic [ref=e146]: "Policy: G3-POLICY-v1"
          - generic [ref=e147]:
            - generic [ref=e148]:
              - generic [ref=e149]: Risk Level
              - generic [ref=e150]: CRITICAL
            - generic [ref=e151]:
              - generic [ref=e152]: Exact Phrases
              - generic [ref=e153]: "6"
            - generic [ref=e154]:
              - generic [ref=e155]: N-Gram Findings
              - generic [ref=e156]: "1"
            - generic [ref=e157]:
              - generic [ref=e158]: Human Review
              - generic [ref=e159]: REQUIRED
          - generic [ref=e163]:
            - strong [ref=e164]: "Human Academic Review Boundary:"
            - text: This result identifies similarity evidence. It does not constitute a final academic misconduct determination. Human academic review is required.
        - generic [ref=e165]:
          - heading "Canonical Document Evidence Payload" [level=3] [ref=e172]
          - generic [ref=e173]:
            - mark [ref=e174] [cursor=pointer]: Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks By Dr. Aris Thorne, Prof. Elena Rostova, and Dr. Marcus Vance (2024) Journal of Advanced Computer Science & Quantum Information Systems, Vol.
            - text: "14, DOI: 10.1038/s41586-023-00001-x, ISBN: 978-0-123456-78-9. Abstract: Federated learning across decoupled edge networks faces significant communication latency and security challenges. In this paper, we propose a novel quantum-inspired architectural paradigm for high-order evidence-oriented systems. By utilizing deterministic hashing and provenance verification, our model achieves 99."
            - mark [ref=e175] [cursor=pointer]: 4% accuracy across distributed node topology while preserving complete privacy. We compare our approach against standard Crossref and OpenAlex benchmarks.
            - mark [ref=e176] [cursor=pointer]: "Introduction: Distributed machine learning frameworks require mathematical determinism to guarantee non-repudiation of student submissions and academic evidence."
            - text: Previous work by Vance et al. demonstrated that probabilistic AI inference cannot serve as sole authority without deterministic evidence grounding.
        - generic [ref=e177]:
          - generic [ref=e178]:
            - generic [ref=e179]:
              - heading "Correction Guidance" [level=3] [ref=e180]
              - paragraph [ref=e184]: Deterministic remediation recommendations & citation payload per verified overlap
            - generic [ref=e185]: 7 Verified Overlaps
          - generic [ref=e189]:
            - generic [ref=e190]:
              - generic [ref=e191]:
                - generic [ref=e192]:
                  - generic [ref=e193]: "Finding #1"
                  - generic [ref=e194]: EXACT_PHRASE
                  - generic [ref=e195]: (100% similarity)
                - button "Show in document" [ref=e196]
              - generic [ref=e200]:
                - generic [ref=e201]: Flagged Passage in Document
                - generic [ref=e202]: "\"Marcus Vance (2024) Journal of Advanced Computer Science & Quantum Information Systems, Vol.\""
              - generic [ref=e203]:
                - generic [ref=e204]:
                  - generic [ref=e205]: Source Title
                  - text: Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks
                - generic [ref=e206]:
                  - generic [ref=e207]: Authors
                  - text: Aris Thorne
                - generic [ref=e208]:
                  - generic [ref=e209]: Published Year
                  - text: "2024"
                - generic [ref=e210]:
                  - generic [ref=e211]: DOI / ISBN
                  - 'link "DOI: 10.9999/gradifi-r6-a" [ref=e212] [cursor=pointer]':
                    - /url: https://doi.org/10.9999/gradifi-r6-a
              - generic [ref=e218]:
                - generic [ref=e219]:
                  - generic [ref=e220]: Standard Citation
                  - generic [ref=e221]:
                    - button "APA" [ref=e222]
                    - button "MLA" [ref=e223]
                    - button "Chicago" [ref=e224]
                    - button "Harvard" [ref=e225]
                - generic [ref=e226]: Aris Thorne. (2024). Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks. https://doi.org/10.9999/gradifi-r6-a
              - generic [ref=e227]:
                - generic [ref=e228]: Recommended Remediation Actions
                - generic [ref=e229]:
                  - button "Add a citation to this source" [ref=e230]
                  - button "Paraphrase this passage" [ref=e234]
              - generic [ref=e238]:
                - button "Copy citation" [ref=e239]
                - button "View source" [ref=e243]
                - button "Show in document" [ref=e248]
            - generic [ref=e252]:
              - generic [ref=e253]:
                - generic [ref=e254]:
                  - generic [ref=e255]: "Finding #2"
                  - generic [ref=e256]: EXACT_PHRASE
                  - generic [ref=e257]: (100% similarity)
                - button "Show in document" [ref=e258]
              - generic [ref=e262]:
                - generic [ref=e263]: Flagged Passage in Document
                - generic [ref=e264]: "\"We compare our approach against standard Crossref and OpenAlex benchmarks.\""
              - generic [ref=e265]:
                - generic [ref=e266]:
                  - generic [ref=e267]: Source Title
                  - text: Distributed Machine Learning Determinism
                - generic [ref=e268]:
                  - generic [ref=e269]: Authors
                  - text: Elena Rostova
                - generic [ref=e270]:
                  - generic [ref=e271]: Published Year
                  - text: "2024"
                - generic [ref=e272]:
                  - generic [ref=e273]: DOI / ISBN
                  - 'link "DOI: 10.9999/gradifi-r6-b" [ref=e274] [cursor=pointer]':
                    - /url: https://doi.org/10.9999/gradifi-r6-b
              - generic [ref=e280]:
                - generic [ref=e281]:
                  - generic [ref=e282]: Standard Citation
                  - generic [ref=e283]:
                    - button "APA" [ref=e284]
                    - button "MLA" [ref=e285]
                    - button "Chicago" [ref=e286]
                    - button "Harvard" [ref=e287]
                - generic [ref=e288]: Elena Rostova. (2024). Distributed Machine Learning Determinism. https://doi.org/10.9999/gradifi-r6-b
              - generic [ref=e289]:
                - generic [ref=e290]: Recommended Remediation Actions
                - generic [ref=e291]:
                  - button "Add a citation to this source" [ref=e292]
                  - button "Paraphrase this passage" [ref=e296]
              - generic [ref=e300]:
                - button "Copy citation" [ref=e301]
                - button "View source" [ref=e305]
                - button "Show in document" [ref=e310]
            - generic [ref=e314]:
              - generic [ref=e315]:
                - generic [ref=e316]:
                  - generic [ref=e317]: "Finding #3"
                  - generic [ref=e318]: EXACT_PHRASE
                  - generic [ref=e319]: (100% similarity)
                - button "Show in document" [ref=e320]
              - generic [ref=e324]:
                - generic [ref=e325]: Flagged Passage in Document
                - generic [ref=e326]: "\"Aris Thorne, Prof.\""
              - generic [ref=e327]:
                - generic [ref=e328]:
                  - generic [ref=e329]: Source Title
                  - text: Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks
                - generic [ref=e330]:
                  - generic [ref=e331]: Authors
                  - text: Aris Thorne
                - generic [ref=e332]:
                  - generic [ref=e333]: Published Year
                  - text: "2024"
                - generic [ref=e334]:
                  - generic [ref=e335]: DOI / ISBN
                  - 'link "DOI: 10.9999/gradifi-r6-a" [ref=e336] [cursor=pointer]':
                    - /url: https://doi.org/10.9999/gradifi-r6-a
              - generic [ref=e342]:
                - generic [ref=e343]:
                  - generic [ref=e344]: Standard Citation
                  - generic [ref=e345]:
                    - button "APA" [ref=e346]
                    - button "MLA" [ref=e347]
                    - button "Chicago" [ref=e348]
                    - button "Harvard" [ref=e349]
                - generic [ref=e350]: Aris Thorne. (2024). Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks. https://doi.org/10.9999/gradifi-r6-a
              - generic [ref=e351]:
                - generic [ref=e352]: Recommended Remediation Actions
                - generic [ref=e353]:
                  - button "Add a citation to this source" [ref=e354]
                  - button "Paraphrase this passage" [ref=e358]
              - generic [ref=e362]:
                - button "Copy citation" [ref=e363]
                - button "View source" [ref=e367]
                - button "Show in document" [ref=e372]
            - generic [ref=e376]:
              - generic [ref=e377]:
                - generic [ref=e378]:
                  - generic [ref=e379]: "Finding #4"
                  - generic [ref=e380]: EXACT_PHRASE
                  - generic [ref=e381]: (100% similarity)
                - button "Show in document" [ref=e382]
              - generic [ref=e386]:
                - generic [ref=e387]: Flagged Passage in Document
                - generic [ref=e388]: "\"Elena Rostova, and Dr.\""
              - generic [ref=e389]:
                - generic [ref=e390]:
                  - generic [ref=e391]: Source Title
                  - text: Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks
                - generic [ref=e392]:
                  - generic [ref=e393]: Authors
                  - text: Aris Thorne
                - generic [ref=e394]:
                  - generic [ref=e395]: Published Year
                  - text: "2024"
                - generic [ref=e396]:
                  - generic [ref=e397]: DOI / ISBN
                  - 'link "DOI: 10.9999/gradifi-r6-a" [ref=e398] [cursor=pointer]':
                    - /url: https://doi.org/10.9999/gradifi-r6-a
              - generic [ref=e404]:
                - generic [ref=e405]:
                  - generic [ref=e406]: Standard Citation
                  - generic [ref=e407]:
                    - button "APA" [ref=e408]
                    - button "MLA" [ref=e409]
                    - button "Chicago" [ref=e410]
                    - button "Harvard" [ref=e411]
                - generic [ref=e412]: Aris Thorne. (2024). Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks. https://doi.org/10.9999/gradifi-r6-a
              - generic [ref=e413]:
                - generic [ref=e414]: Recommended Remediation Actions
                - generic [ref=e415]:
                  - button "Add a citation to this source" [ref=e416]
                  - button "Paraphrase this passage" [ref=e420]
              - generic [ref=e424]:
                - button "Copy citation" [ref=e425]
                - button "View source" [ref=e429]
                - button "Show in document" [ref=e434]
            - generic [ref=e438]:
              - generic [ref=e439]:
                - generic [ref=e440]:
                  - generic [ref=e441]: "Finding #5"
                  - generic [ref=e442]: EXACT_PHRASE
                  - generic [ref=e443]: (100% similarity)
                - button "Show in document" [ref=e444]
              - generic [ref=e448]:
                - generic [ref=e449]: Flagged Passage in Document
                - generic [ref=e450]: "\"Introduction: Distributed machine learning frameworks require mathematical determinism to guarantee non-repudiation of student submissions and academic evidence.\""
              - generic [ref=e451]:
                - generic [ref=e452]:
                  - generic [ref=e453]: Source Title
                  - text: Distributed Machine Learning Determinism
                - generic [ref=e454]:
                  - generic [ref=e455]: Authors
                  - text: Elena Rostova
                - generic [ref=e456]:
                  - generic [ref=e457]: Published Year
                  - text: "2024"
                - generic [ref=e458]:
                  - generic [ref=e459]: DOI / ISBN
                  - 'link "DOI: 10.9999/gradifi-r6-b" [ref=e460] [cursor=pointer]':
                    - /url: https://doi.org/10.9999/gradifi-r6-b
              - generic [ref=e466]:
                - generic [ref=e467]:
                  - generic [ref=e468]: Standard Citation
                  - generic [ref=e469]:
                    - button "APA" [ref=e470]
                    - button "MLA" [ref=e471]
                    - button "Chicago" [ref=e472]
                    - button "Harvard" [ref=e473]
                - generic [ref=e474]: Elena Rostova. (2024). Distributed Machine Learning Determinism. https://doi.org/10.9999/gradifi-r6-b
              - generic [ref=e475]:
                - generic [ref=e476]: Recommended Remediation Actions
                - generic [ref=e477]:
                  - button "Add a citation to this source" [ref=e478]
                  - button "Paraphrase this passage" [ref=e482]
              - generic [ref=e486]:
                - button "Copy citation" [ref=e487]
                - button "View source" [ref=e491]
                - button "Show in document" [ref=e496]
            - generic [ref=e500]:
              - generic [ref=e501]:
                - generic [ref=e502]:
                  - generic [ref=e503]: "Finding #6"
                  - generic [ref=e504]: EXACT_PHRASE
                  - generic [ref=e505]: (100% similarity)
                - button "Show in document" [ref=e506]
              - generic [ref=e510]:
                - generic [ref=e511]: Flagged Passage in Document
                - generic [ref=e512]: "\"Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks By Dr.\""
              - generic [ref=e513]:
                - generic [ref=e514]:
                  - generic [ref=e515]: Source Title
                  - text: Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks
                - generic [ref=e516]:
                  - generic [ref=e517]: Authors
                  - text: Aris Thorne
                - generic [ref=e518]:
                  - generic [ref=e519]: Published Year
                  - text: "2024"
                - generic [ref=e520]:
                  - generic [ref=e521]: DOI / ISBN
                  - 'link "DOI: 10.9999/gradifi-r6-a" [ref=e522] [cursor=pointer]':
                    - /url: https://doi.org/10.9999/gradifi-r6-a
              - generic [ref=e528]:
                - generic [ref=e529]:
                  - generic [ref=e530]: Standard Citation
                  - generic [ref=e531]:
                    - button "APA" [ref=e532]
                    - button "MLA" [ref=e533]
                    - button "Chicago" [ref=e534]
                    - button "Harvard" [ref=e535]
                - generic [ref=e536]: Aris Thorne. (2024). Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks. https://doi.org/10.9999/gradifi-r6-a
              - generic [ref=e537]:
                - generic [ref=e538]: Recommended Remediation Actions
                - generic [ref=e539]:
                  - button "Add a citation to this source" [ref=e540]
                  - button "Paraphrase this passage" [ref=e544]
              - generic [ref=e548]:
                - button "Copy citation" [ref=e549]
                - button "View source" [ref=e553]
                - button "Show in document" [ref=e558]
            - generic [ref=e562]:
              - generic [ref=e563]:
                - generic [ref=e564]:
                  - generic [ref=e565]: "Finding #7"
                  - generic [ref=e566]: NGRAM
                  - generic [ref=e567]: (30% similarity)
                - button "Show in document" [ref=e568]
              - generic [ref=e572]:
                - generic [ref=e573]: Flagged Passage in Document
                - generic [ref=e574]: "\"4% accuracy across distributed node topology while preserving complete privacy.\""
              - generic [ref=e575]:
                - generic [ref=e576]:
                  - generic [ref=e577]: Source Title
                  - text: Distributed Machine Learning Determinism
                - generic [ref=e578]:
                  - generic [ref=e579]: Authors
                  - text: Elena Rostova
                - generic [ref=e580]:
                  - generic [ref=e581]: Published Year
                  - text: "2024"
                - generic [ref=e582]:
                  - generic [ref=e583]: DOI / ISBN
                  - 'link "DOI: 10.9999/gradifi-r6-b" [ref=e584] [cursor=pointer]':
                    - /url: https://doi.org/10.9999/gradifi-r6-b
              - generic [ref=e590]:
                - generic [ref=e591]:
                  - generic [ref=e592]: Standard Citation
                  - generic [ref=e593]:
                    - button "APA" [ref=e594]
                    - button "MLA" [ref=e595]
                    - button "Chicago" [ref=e596]
                    - button "Harvard" [ref=e597]
                - generic [ref=e598]: Elena Rostova. (2024). Distributed Machine Learning Determinism. https://doi.org/10.9999/gradifi-r6-b
              - generic [ref=e599]:
                - generic [ref=e600]: Recommended Remediation Actions
                - generic [ref=e601]:
                  - button "Add a citation to this source" [ref=e602]
                  - button "Paraphrase this passage" [ref=e606]
              - generic [ref=e610]:
                - button "Copy citation" [ref=e611]
                - button "View source" [ref=e615]
                - button "Show in document" [ref=e620]
        - generic [ref=e624]:
          - generic [ref=e625]:
            - generic [ref=e626]:
              - heading "Source Attribution & Citation Hub (P5)" [level=3] [ref=e627]
              - paragraph [ref=e630]: Authoritative Bibliographic Sources • Validated DOI / ISBN Linking • Academic Citations
            - generic [ref=e631]: 5 Verified Sources
          - generic [ref=e638]:
            - strong [ref=e639]: "Source Attribution Boundary:"
            - text: Source attribution provides verified academic and bibliographic record details linked via
            - code [ref=e640]: sourceId
            - text: . It does not label sources as plagiarism.
          - generic [ref=e641]:
            - generic [ref=e642] [cursor=pointer]:
              - generic [ref=e643]:
                - generic [ref=e644]:
                  - generic [ref=e645]: Academic Source
                  - generic [ref=e646]: "ID: doi:10.9999/gradifi-r6-a"
                - generic [ref=e647]: 68.6% Similarity Match
              - heading "Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks" [level=4] [ref=e648]
              - generic [ref=e649]:
                - generic [ref=e650]: "Authors: Aris Thorne"
                - generic [ref=e651]: "Year: 2024"
              - generic [ref=e652]:
                - 'link "DOI: 10.9999/gradifi-r6-a" [ref=e653]':
                  - /url: https://doi.org/10.9999/gradifi-r6-a
                - generic [ref=e659]: ISBN unavailable
                - generic [ref=e660]: 4 Matched Evidence Passages
              - generic [ref=e665]:
                - generic [ref=e666]:
                  - generic [ref=e667]: Academic Citation
                  - generic [ref=e671]:
                    - button "apa" [ref=e672]
                    - button "mla" [ref=e673]
                    - button "chicago" [ref=e674]
                    - button "harvard" [ref=e675]
                - generic [ref=e676]:
                  - paragraph [ref=e677]: Aris Thorne (2024). Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks. https://doi.org/10.9999/gradifi-r6-a
                  - button "Copy Citation" [ref=e678]
              - generic [ref=e682]:
                - generic [ref=e683]: "Linked Similarity Evidence Passages (4):"
                - generic [ref=e684]:
                  - generic [ref=e685]:
                    - generic [ref=e686]: "\"Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks By Dr. \""
                    - generic [ref=e687]: "[0, 93)"
                  - generic [ref=e688]:
                    - generic [ref=e689]: "\"Aris Thorne, Prof. \""
                    - generic [ref=e690]: "[93, 112)"
                  - generic [ref=e691]:
                    - generic [ref=e692]: "\"Elena Rostova, and Dr. \""
                    - generic [ref=e693]: "[112, 135)"
                  - generic [ref=e694]:
                    - generic [ref=e695]: "\"Marcus Vance (2024) Journal of Advanced Computer Science & Quantum Information Systems, Vol. \""
                    - generic [ref=e696]: "[135, 228)"
            - generic [ref=e697] [cursor=pointer]:
              - generic [ref=e698]:
                - generic [ref=e699]:
                  - generic [ref=e700]: Academic Source
                  - generic [ref=e701]: "ID: doi:10.9999/gradifi-r6-b"
                - generic [ref=e702]: 70.5% Similarity Match
              - heading "Distributed Machine Learning Determinism" [level=4] [ref=e703]
              - generic [ref=e704]:
                - generic [ref=e705]: "Authors: Elena Rostova"
                - generic [ref=e706]: "Year: 2024"
              - generic [ref=e707]:
                - 'link "DOI: 10.9999/gradifi-r6-b" [ref=e708]':
                  - /url: https://doi.org/10.9999/gradifi-r6-b
                - generic [ref=e714]: ISBN unavailable
                - generic [ref=e715]: 3 Matched Evidence Passages
              - generic [ref=e720]:
                - generic [ref=e721]:
                  - generic [ref=e722]: Academic Citation
                  - generic [ref=e726]:
                    - button "apa" [ref=e727]
                    - button "mla" [ref=e728]
                    - button "chicago" [ref=e729]
                    - button "harvard" [ref=e730]
                - generic [ref=e731]:
                  - paragraph [ref=e732]: Elena Rostova (2024). Distributed Machine Learning Determinism. https://doi.org/10.9999/gradifi-r6-b
                  - button "Copy Citation" [ref=e733]
              - generic [ref=e737]:
                - generic [ref=e738]: "Linked Similarity Evidence Passages (3):"
                - generic [ref=e739]:
                  - generic [ref=e740]:
                    - generic [ref=e741]: "\"4% accuracy across distributed node topology while preserving complete privacy. \""
                    - generic [ref=e742]: "[618, 698)"
                  - generic [ref=e743]:
                    - generic [ref=e744]: "\"We compare our approach against standard Crossref and OpenAlex benchmarks.\""
                    - generic [ref=e745]: "[698, 772)"
                  - generic [ref=e746]:
                    - generic [ref=e747]: "\"Introduction: Distributed machine learning frameworks require mathematical determinism to guarantee non-repudiation of student submissions and academic evidence. \""
                    - generic [ref=e748]: "[774, 936)"
            - generic [ref=e749] [cursor=pointer]:
              - generic [ref=e750]:
                - generic [ref=e751]:
                  - generic [ref=e752]: Academic Source
                  - generic [ref=e753]: "ID: s2:7d4229937004f37fb97332836741c8431965beff"
                - generic [ref=e754]: 6.3% Similarity Match
              - 'heading "Quantum-Safe Neuro-Symbolic Intelligence: A Lossless Framework for Vertical Federated Learning in Decoupled Data Silos" [level=4] [ref=e755]'
              - generic [ref=e756]:
                - generic [ref=e757]: "Authors: P. Meenadharshini, S. Parkavi, M. Manjuladevi, B. Mohan, B. K. Devi, V. S. Hari Krishna"
                - generic [ref=e758]: "Year: 2026"
              - generic [ref=e759]:
                - 'link "DOI: 10.1109/icnwc68145.2026.11518212" [ref=e760]':
                  - /url: https://doi.org/10.1109/icnwc68145.2026.11518212
                - generic [ref=e766]: ISBN unavailable
              - generic [ref=e767]:
                - generic [ref=e768]:
                  - generic [ref=e769]: Academic Citation
                  - generic [ref=e773]:
                    - button "apa" [ref=e774]
                    - button "mla" [ref=e775]
                    - button "chicago" [ref=e776]
                    - button "harvard" [ref=e777]
                - generic [ref=e778]:
                  - paragraph [ref=e779]: "P. Meenadharshini, S. Parkavi, M. Manjuladevi, B. Mohan, B. K. Devi, V. S. Hari Krishna (2026). Quantum-Safe Neuro-Symbolic Intelligence: A Lossless Framework for Vertical Federated Learning in Decoupled Data Silos. https://doi.org/10.1109/icnwc68145.2026.11518212"
                  - button "Copy Citation" [ref=e780]
            - generic [ref=e784] [cursor=pointer]:
              - generic [ref=e785]:
                - generic [ref=e786]:
                  - generic [ref=e787]: Academic Source
                  - generic [ref=e788]: "ID: s2:7f2a3ecaaf27bf8e3b83d5cce2a83bec8c0ec3fd"
                - generic [ref=e789]: 7.5% Similarity Match
              - 'heading "Machine Learning for Advancing Quantum Field Theory-Enabled Sensor Networks in Precision Disease Detection: A Review" [level=4] [ref=e790]'
              - generic [ref=e791]:
                - generic [ref=e792]: "Authors: Khanal Pratik, A. Khanal"
                - generic [ref=e793]: "Year: 2025"
              - generic [ref=e794]:
                - 'link "DOI: 10.3126/cjost.v1i1.88577" [ref=e795]':
                  - /url: https://doi.org/10.3126/cjost.v1i1.88577
                - generic [ref=e801]: ISBN unavailable
              - generic [ref=e802]:
                - generic [ref=e803]:
                  - generic [ref=e804]: Academic Citation
                  - generic [ref=e808]:
                    - button "apa" [ref=e809]
                    - button "mla" [ref=e810]
                    - button "chicago" [ref=e811]
                    - button "harvard" [ref=e812]
                - generic [ref=e813]:
                  - paragraph [ref=e814]: "Khanal Pratik, A. Khanal (2025). Machine Learning for Advancing Quantum Field Theory-Enabled Sensor Networks in Precision Disease Detection: A Review. https://doi.org/10.3126/cjost.v1i1.88577"
                  - button "Copy Citation" [ref=e815]
            - generic [ref=e819] [cursor=pointer]:
              - generic [ref=e820]:
                - generic [ref=e821]:
                  - generic [ref=e822]: Academic Source
                  - generic [ref=e823]: "ID: s2:a7083fe2df1f07c21790c354d730cd41773c49e0"
                - generic [ref=e824]: 4.8% Similarity Match
              - heading "Reliable Federated Disentangling Network for Non-IID Domain Feature" [level=4] [ref=e825]
              - generic [ref=e826]:
                - generic [ref=e827]: "Authors: M. Wang, Kai-An Yu, Chun-Mei Feng, Yiming Qian, K. Zou, Lian-Yu Wang, R. Goh, Xin-Xing Xu, Yong Liu, H. Fu"
                - generic [ref=e828]: "Year: 2023"
              - generic [ref=e829]:
                - 'link "DOI: 10.1109/TBDATA.2024.3423694" [ref=e830]':
                  - /url: https://doi.org/10.1109/TBDATA.2024.3423694
                - generic [ref=e836]: ISBN unavailable
              - generic [ref=e837]:
                - generic [ref=e838]:
                  - generic [ref=e839]: Academic Citation
                  - generic [ref=e843]:
                    - button "apa" [ref=e844]
                    - button "mla" [ref=e845]
                    - button "chicago" [ref=e846]
                    - button "harvard" [ref=e847]
                - generic [ref=e848]:
                  - paragraph [ref=e849]: M. Wang, Kai-An Yu, Chun-Mei Feng, Yiming Qian, K. Zou, Lian-Yu Wang, R. Goh, Xin-Xing Xu, Yong Liu, H. Fu (2023). Reliable Federated Disentangling Network for Non-IID Domain Feature. https://doi.org/10.1109/TBDATA.2024.3423694
                  - button "Copy Citation" [ref=e850]
        - generic [ref=e854]:
          - generic [ref=e855]:
            - generic [ref=e856]:
              - heading "5. Similarity & Plagiarism Evidence" [level=3] [ref=e857]
              - generic [ref=e861]: LOW
            - generic [ref=e862]:
              - generic [ref=e863]:
                - generic [ref=e864]: 47.6%
                - generic [ref=e865]: Unique Matched Coverage
              - generic [ref=e866]:
                - generic [ref=e867]: 70.5%
                - generic [ref=e868]: Highest Source Match
            - generic [ref=e869]:
              - generic [ref=e870]:
                - generic [ref=e871]: "5"
                - generic [ref=e872]: Sources
              - generic [ref=e873]:
                - generic [ref=e874]: "3"
                - generic [ref=e875]: Paragraphs
              - generic [ref=e876]:
                - generic [ref=e877]: "7"
                - generic [ref=e878]: Sentences
              - generic [ref=e879]:
                - generic [ref=e880]: "117"
                - generic [ref=e881]: Phrases
            - generic [ref=e882]:
              - generic [ref=e883]:
                - generic [ref=e884]: "Evidence Breakdown (Source → Unit):"
                - generic [ref=e885]: 5 Matched Sources
              - generic [ref=e886]:
                - group [ref=e887]:
                  - generic "Distributed Machine Learning Determinism 26.2% Cov | 100.0% Max" [ref=e888] [cursor=pointer]:
                    - generic [ref=e889]: Distributed Machine Learning Determinism
                    - generic [ref=e890]: 26.2% Cov | 100.0% Max
                - group [ref=e891]:
                  - generic "Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks 21.4% Cov | 100.0% Max" [ref=e892] [cursor=pointer]:
                    - generic [ref=e893]: Quantum Entanglement and Decoupled Neural Architecture in Federated Learning Networks
                    - generic [ref=e894]: 21.4% Cov | 100.0% Max
                - group [ref=e895]:
                  - 'generic "Machine Learning for Advancing Quantum Field Theory-Enabled Sensor Networks in Precision Disease Detection: A Review 0.0% Cov | 12.5% Max" [ref=e896] [cursor=pointer]':
                    - generic [ref=e897]: "Machine Learning for Advancing Quantum Field Theory-Enabled Sensor Networks in Precision Disease Detection: A Review"
                    - generic [ref=e898]: 0.0% Cov | 12.5% Max
                - group [ref=e899]:
                  - 'generic "Quantum-Safe Neuro-Symbolic Intelligence: A Lossless Framework for Vertical Federated Learning in Decoupled Data Silos 0.0% Cov | 10.5% Max" [ref=e900] [cursor=pointer]':
                    - generic [ref=e901]: "Quantum-Safe Neuro-Symbolic Intelligence: A Lossless Framework for Vertical Federated Learning in Decoupled Data Silos"
                    - generic [ref=e902]: 0.0% Cov | 10.5% Max
                - group [ref=e903]:
                  - generic "Reliable Federated Disentangling Network for Non-IID Domain Feature 0.0% Cov | 8.0% Max" [ref=e904] [cursor=pointer]:
                    - generic [ref=e905]: Reliable Federated Disentangling Network for Non-IID Domain Feature
                    - generic [ref=e906]: 0.0% Cov | 8.0% Max
              - generic [ref=e907]:
                - generic [ref=e908]: "Provenance Authority:"
                - generic [ref=e909]: DETERMINISTIC SIM-V1
          - generic [ref=e910]:
            - generic [ref=e911]:
              - heading "4. AI Federation" [level=3] [ref=e912]
              - generic [ref=e916]: NON-AUTHORITATIVE
            - generic [ref=e917]:
              - generic [ref=e918]:
                - generic [ref=e919]: AI Findings Interpretation
                - paragraph [ref=e923]: AI Federation unavailable. No AI-derived signals were produced. Deterministic similarity findings above remain authoritative.
              - generic [ref=e924]:
                - generic [ref=e925]:
                  - generic [ref=e926]: "Gemini 2.5 Flash:"
                  - generic [ref=e927]: INFERENCE_FAILED
                - generic [ref=e928]:
                  - generic [ref=e929]: "Nvidia Nemotron:"
                  - generic [ref=e930]: TIMEOUT
                - generic [ref=e931]:
                  - generic [ref=e932]: "Local Gemma Engine:"
                  - generic [ref=e933]: RUNTIME_AVAILABLE
        - generic [ref=e934]:
          - generic [ref=e935]:
            - heading "7. Gradifi Verification Matrix" [level=2] [ref=e936]
            - generic [ref=e941]: 5 Verified Academic Sources
          - table [ref=e943]:
            - rowgroup [ref=e944]:
              - row [ref=e945]:
                - columnheader "Provider / Source" [ref=e946]
                - columnheader "Credential" [ref=e947]
                - columnheader "Request" [ref=e948]
                - columnheader "Response" [ref=e949]
                - columnheader "Canonical Color Status" [ref=e950]
            - rowgroup [ref=e951]:
              - row [ref=e952]:
                - cell "OpenAlex" [ref=e953]
                - cell "VERIFIED" [ref=e954]
                - cell "VERIFIED" [ref=e955]
                - cell "EMPTY" [ref=e956]
                - cell "No matches" [ref=e957]
              - row [ref=e960]:
                - cell "Crossref" [ref=e961]
                - cell "VERIFIED" [ref=e962]
                - cell "VERIFIED" [ref=e963]
                - cell "VERIFIED" [ref=e964]
                - cell "Verified" [ref=e965]
              - row [ref=e968]:
                - cell "Unpaywall" [ref=e969]
                - cell "NOT_APPLICABLE" [ref=e970]
                - cell "VERIFIED" [ref=e971]
                - cell "EMPTY" [ref=e972]
                - cell "No matches" [ref=e973]
              - row [ref=e976]:
                - cell "CORE" [ref=e977]
                - cell "VERIFIED" [ref=e978]
                - cell "VERIFIED" [ref=e979]
                - cell "EMPTY" [ref=e980]
                - cell "No matches" [ref=e981]
              - row [ref=e984]:
                - cell "Google Books" [ref=e985]
                - cell "VERIFIED" [ref=e986]
                - cell "FAILED" [ref=e987]
                - cell "FAILED" [ref=e988]
                - cell "Unreachable" [ref=e989]
              - row [ref=e992]:
                - cell "Semantic Scholar" [ref=e993]
                - cell "VERIFIED" [ref=e994]
                - cell "VERIFIED" [ref=e995]
                - cell "VERIFIED" [ref=e996]
                - cell "Verified" [ref=e997]
              - row [ref=e1000]:
                - cell "Gemini" [ref=e1001]
                - cell "VERIFIED" [ref=e1002]
                - cell "FAILED" [ref=e1003]
                - cell "FAILED" [ref=e1004]
                - cell "Inference Failed" [ref=e1005]
              - row [ref=e1008]:
                - cell "Nemotron" [ref=e1009]
                - cell "VERIFIED" [ref=e1010]
                - cell "FAILED" [ref=e1011]
                - cell "FAILED" [ref=e1012]
                - cell "Timed out" [ref=e1013]
              - row [ref=e1016]:
                - cell "Gemma" [ref=e1017]
                - cell "NOT_APPLICABLE" [ref=e1018]
                - cell "FAILED" [ref=e1019]
                - cell "EMPTY" [ref=e1020]
                - cell "RUNTIME_AVAILABLE" [ref=e1021]
        - generic [ref=e1024]:
          - generic [ref=e1030]:
            - generic [ref=e1031]: 8. Scannable QR Receipt
            - generic [ref=e1032]: VRF-R6STUBMVDR8W
            - generic [ref=e1033]: "Timestamp: Sun, 18 Oct 2026 11:41:28 GMT"
            - generic [ref=e1034]: "Hash: b63738fb51c2f655..."
          - button "Download PDF Verification Report" [ref=e1036] [cursor=pointer]
  - generic [ref=e1041]:
    - generic [ref=e1042]: Online
    - button "Sync Now" [ref=e1049]
```

# Test source

```ts
  1   | /**
  2   |  * HOEOS G4 - INDEPENDENT ENGINE CERTIFICATION SPEC (R6)
  3   |  *
  4   |  * Runs the real verifyCoreService against a standard production build (seam absent)
  5   |  * with provider stubs active (R6_PROVIDER_STUB=true).
  6   |  */
  7   | 
  8   | import { test, expect } from '@playwright/test';
  9   | import fs from 'fs';
  10  | import path from 'path';
  11  | 
  12  | const STUB_SOURCE_IDS = new Set([
  13  |   'doi:10.9999/gradifi-r6-a',
  14  |   'doi:10.9999/gradifi-r6-b',
  15  | ]);
  16  | 
  17  | test.describe('HOEOS G4 Engine Certification (R6)', () => {
  18  |   test('real engine produces stub-attributed findings and DOM faithfully renders them', async ({ page }) => {
  19  |     test.setTimeout(90000);
  20  | 
  21  |     await page.goto('/tools/plagiarism');
  22  |     await page.waitForLoadState('networkidle');
  23  | 
  24  |     const seamAtLoad = await page.evaluate(
  25  |       () => typeof (window as any).__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__
  26  |     );
  27  |     expect(seamAtLoad).toBe('undefined');
  28  | 
  29  |     await page.locator('button:has-text("Pre-load Demo Document")').click();
  30  |     const textarea = page.locator('textarea[placeholder*="Paste academic paper"]');
  31  |     const loadedText = await textarea.inputValue();
  32  |     expect(loadedText.length).toBeGreaterThan(1000);
  33  | 
  34  |     await page.locator('button:has-text("Run Academic Evidence Verification")').click();
  35  |     await page.waitForSelector('text=Canonical Document Evidence Payload', { timeout: 60000 });
  36  | 
  37  |     const seamAfterRun = await page.evaluate(
  38  |       () => typeof (window as any).__GRADIFI_TEST_TRANSFORM_VERIFY_RESULT__
  39  |     );
  40  |     expect(seamAfterRun).toBe('undefined');
  41  | 
  42  |     const engineResult = await page.evaluate(
  43  |       () => (window as any).__GRADIFI_VERIFY_RESULT__
  44  |     );
  45  |     expect(engineResult).toBeTruthy();
  46  |     expect(engineResult.canonicalDocument).toBeTruthy();
  47  |     const canonicalText: string = engineResult.canonicalDocument.rawText;
  48  | 
  49  |     const findings: any[] = engineResult?.similarityAnalysis?.findings || [];
  50  |     expect(findings.length, 'engine must produce at least one finding').toBeGreaterThan(0);
  51  | 
  52  |     for (const f of findings) {
  53  |       expect(
  54  |         STUB_SOURCE_IDS.has(f.matchedDocumentId),
  55  |         `finding ${f.findingId} attributed to non-stub source ${f.matchedDocumentId}`
  56  |       ).toBe(true);
  57  |     }
  58  | 
  59  |     const viewer = page.locator('[data-testid="canonical-document-viewer"]');
  60  |     await expect(viewer).toBeVisible();
  61  | 
  62  |     const marks = viewer.locator('mark[data-finding-id]');
  63  |     const markCount = await marks.count();
> 64  |     expect(markCount, 'DOM mark count must equal engine finding count').toBe(findings.length);
      |                                                                         ^ Error: DOM mark count must equal engine finding count
  65  | 
  66  |     const findingById = new Map<string, any>();
  67  |     for (const f of findings) findingById.set(f.findingId, f);
  68  | 
  69  |     const domFindings: Array<{ findingId: string; sourceId: string; start: number; end: number; text: string }> = [];
  70  |     for (let i = 0; i < markCount; i++) {
  71  |       const mark = marks.nth(i);
  72  |       const findingId = await mark.getAttribute('data-finding-id');
  73  |       const sourceId = await mark.getAttribute('data-source-id');
  74  |       const startAttr = await mark.getAttribute('data-start-offset');
  75  |       const endAttr = await mark.getAttribute('data-end-offset');
  76  |       const textSpan = mark.locator('[data-highlight-text]');
  77  |       const markText = ((await textSpan.textContent()) || '');
  78  | 
  79  |       expect(findingId).toBeTruthy();
  80  |       expect(sourceId).toBeTruthy();
  81  |       expect(startAttr).toBeTruthy();
  82  |       expect(endAttr).toBeTruthy();
  83  | 
  84  |       const start = parseInt(startAttr!, 10);
  85  |       const end = parseInt(endAttr!, 10);
  86  | 
  87  |       const engineFinding = findingById.get(findingId!);
  88  |       expect(engineFinding, `DOM mark ${findingId} has no engine finding`).toBeTruthy();
  89  |       expect(engineFinding.sourceId ?? engineFinding.matchedDocumentId).toBe(sourceId);
  90  |       expect(start).toBe(engineFinding.sourceStart);
  91  |       expect(end).toBe(engineFinding.sourceEnd);
  92  |       expect(markText).toBe(canonicalText.slice(start, end));
  93  | 
  94  |       domFindings.push({ findingId: findingId!, sourceId: sourceId!, start, end, text: markText });
  95  |     }
  96  | 
  97  |     const evidenceDir = process.env.R6_EVIDENCE_DIR
  98  |       || path.join(process.cwd(), 'evidence', 'g4-r6-engine-certification');
  99  |     fs.mkdirSync(evidenceDir, { recursive: true });
  100 | 
  101 |     const screenshotPath = path.join(evidenceDir, 'r6_dom_highlight.png');
  102 |     await page.screenshot({ path: screenshotPath, fullPage: true });
  103 | 
  104 |     fs.writeFileSync(
  105 |       path.join(evidenceDir, 'r6-engine-result.json'),
  106 |       JSON.stringify({
  107 |         canonicalDocumentLength: canonicalText.length,
  108 |         seamAbsentAtLoad: seamAtLoad === 'undefined',
  109 |         seamAbsentAfterRun: seamAfterRun === 'undefined',
  110 |         stubSourceIds: Array.from(STUB_SOURCE_IDS),
  111 |         findingCount: findings.length,
  112 |         markCount,
  113 |         findings: findings.map((f: any) => ({
  114 |           findingId: f.findingId,
  115 |           sourceId: f.matchedDocumentId,
  116 |           sourceStart: f.sourceStart,
  117 |           sourceEnd: f.sourceEnd,
  118 |           matchMethod: f.matchMethod,
  119 |           similarityScore: f.similarityScore,
  120 |         })),
  121 |         domFindings,
  122 |         screenshotPath: path.relative(process.cwd(), screenshotPath).replace(/\\/g, '/'),
  123 |         timestamp: new Date().toISOString(),
  124 |       }, null, 2)
  125 |     );
  126 |   });
  127 | });
```