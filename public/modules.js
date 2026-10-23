// Add future modules and lectures here. The dashboard reads this manifest; no HTML changes are required.
window.STUDY_MODULES = [
  {
    "id": "nmhs10100",
    "code": "NMHS10100",
    "name": "Health across the Lifespan",
    "short": "Health across the Lifespan",
    "icon": "♡",
    "art": "lifespan",
    "color": "#b6dce7",
    "desc": "Development, people and wellbeing through life.",
    "lectures": []
  },
  {
    "id": "path30080",
    "code": "PATH30080",
    "name": "Disease Mechanisms & Pharmacology",
    "short": "Disease Mechanisms & Pharmacology",
    "icon": "✚",
    "art": "path",
    "color": "#ffcfb2",
    "desc": "Pathways from physiology to disease and treatment.",
    "lectures": []
  },
  {
    "id": "mdsa20030",
    "code": "MDSA20030",
    "name": "Endocrine Biology",
    "short": "Endocrine Biology",
    "icon": "◈",
    "art": "endo",
    "color": "#d9b9e8",
    "desc": "Hypothalamus, pituitary and hormone pathways.",
    "lectures": [
      {
        "id": "hypo",
        "number": "03",
        "title": "Hypothalamus & Pituitary Gland",
        "slides": "28 original slides",
        "chapters": "7 illustrated chapters",
        "href": "lectures/hypothalamus-pituitary.html",
        "guide": "resources/Hypothalamus_and_Pituitary_Illustrated_Study_Guide.pdf",
        "original": "resources/Hypothalamus_and_Pituitary_Original_Lecture.pdf",
        "description": "Nuclei, ADH, water balance, DI, SIADH and oxytocin."
      },
      {
        "id": "anterior",
        "number": "04",
        "title": "The Anterior Pituitary Gland",
        "slides": "29 original slides",
        "chapters": "6 illustrated chapters",
        "href": "lectures/anterior-pituitary.html",
        "guide": "resources/Anterior_Pituitary_Illustrated_Study_Guide.pdf",
        "original": "resources/Anterior_Pituitary_Original_Lecture.pdf",
        "description": "Hormone-producing cells, embryology, prolactin and tumours."
      },
      {
        "id": "growth-hormone-igf-axis",
        "number": "06",
        "title": "Growth Hormone / IGF-I Axis",
        "slides": "29 original slides",
        "chapters": "5 illustrated chapters",
        "href": "lectures/growth-hormone-igf-axis.html",
        "original": "resources/Growth_Hormone_IGF_Axis_Original_Lecture.pdf",
        "description": "GH pulses, IGF-I, growth plate, metabolism, deficiency, resistance and acromegaly."
      },
      {
        "id": "thyroid-physiology",
        "number": "07",
        "title": "Thyroid Physiology",
        "slides": "33 original slides",
        "chapters": "5 illustrated chapters",
        "href": "lectures/thyroid-physiology.html",
        "original": "resources/Thyroid_Physiology_Original_Lecture.pdf",
        "description": "Follicles, synthesis, T3/T4 action, feedback, hypothyroidism and Graves disease."
      },
      {
        "id": "calcium-homeostasis",
        "number": "08",
        "title": "Calcium (and Phosphorus) Homeostasis",
        "slides": "34 original slides",
        "chapters": "Original + explanation",
        "href": "lectures/calcium-homeostasis.html",
        "description": "PTH, CaSR, vitamin D, bone/kidney/gut, calcitonin and parathyroid disorders."
      }
    ]
  },
  {
    "id": "mdsa20010",
    "code": "MDSA20010",
    "name": "GIT / Liver Biology",
    "short": "GIT / Liver Biology",
    "icon": "↝",
    "art": "git",
    "color": "#cee9b4",
    "desc": "Gastrointestinal and liver lectures.",
    "lectures": []
  },
  {
    "id": "anat20060",
    "code": "ANAT20060",
    "name": "Locomotor Biology",
    "short": "Locomotor Biology",
    "icon": "⌁",
    "art": "loco",
    "color": "#d4dbf1",
    "desc": "Bones, joints, muscles and movement.",
    "lectures": [
      {
        "id": "introduction-fascia",
        "number": "01",
        "title": "Introduction & Fascia of the Lower Limb",
        "slides": "31 annotated slides",
        "chapters": "Clear explanations · notes · recall",
        "href": "lectures/introduction-fascia.html",
        "original": "resources/Fascia_Original_Lecture.pdf",
        "description": "Fascial layers and fluid spread, plantar fascia and recall.",
        "noteKey": "introduction-fascia"
      },
      {
        "id": "os-coxae-femur",
        "number": "02",
        "title": "Osteology of the Os Coxae & Femur",
        "slides": "40 annotated slides",
        "chapters": "Clear explanations · notes · recall",
        "href": "lectures/os-coxae-femur.html",
        "original": "resources/Os_Coxae_Femur_Original_Lecture.pdf",
        "description": "Pelvic shape and passages, imaging, angles and clinical cases.",
        "noteKey": "os-coxae-femur"
      },
      {
        "id": "gluteal-region",
        "number": "03",
        "title": "Gluteal Region & Hip Joint",
        "slides": "34 annotated slides",
        "chapters": "Clear explanations · notes · recall",
        "href": "lectures/gluteal-region.html",
        "original": "resources/Gluteal_Region_Original_Lecture.pdf",
        "description": "Gluteal muscles and stability, recall drawings and hip blood supply.",
        "noteKey": "gluteal-region"
      },
      {
        "id": "posterior-thigh",
        "number": "04",
        "title": "Posterior Compartment of the Thigh",
        "slides": "29 annotated slides",
        "chapters": "Clear explanations · notes · recall",
        "href": "lectures/posterior-thigh.html",
        "original": "resources/Posterior_Thigh_Original_Lecture.pdf",
        "description": "Dissection and imaging landmarks, popliteal fossa and swellings.",
        "noteKey": "posterior-thigh"
      },
      {
        "id": "anterior-thigh",
        "number": "05",
        "title": "Anterior Compartment of the Thigh & Femoral Triangle",
        "slides": "27 source slides",
        "chapters": "6 complete teaching chapters · 22 practice questions",
        "href": "lectures/anterior-thigh.html",
        "description": "Femoral triangle, sheath, saphenous vein, quadriceps, knee stability, hernias, femoral nerve and skin territories.",
        "noteKey": "anterior-thigh"
      },
      {
        "id": "medial-thigh",
        "number": "06",
        "title": "Medial Compartment of the Thigh",
        "slides": "27 annotated slides",
        "chapters": "Clear explanations · notes · recall",
        "href": "lectures/medial-thigh.html",
        "original": "resources/Medial_Thigh_Original_Lecture.pdf",
        "description": "Attachments and pes anserinus, sample question and obturator hernia.",
        "noteKey": "medial-thigh"
      },
      {
        "id": "knee-joint",
        "number": "07",
        "title": "Knee Joint",
        "slides": "36 original slides",
        "chapters": "6 chapters · concise explanations · 28 practice questions",
        "href": "lectures/knee-joint.html",
        "original": "lectures/knee-joint.html?original=1",
        "description": "Locking, ligaments, menisci, radiology, bursae, arthroscopy and knee injuries.",
        "noteKey": "knee-joint"
      },
      {
        "id": "lumbar-plexus",
        "number": "08",
        "title": "Lumbar Plexus",
        "slides": "23 original slides",
        "chapters": "5 chapters · concise explanations · 21 practice questions",
        "href": "lectures/lumbar-plexus.html",
        "original": "lectures/lumbar-plexus.html?original=1",
        "description": "All six nerves: roots, routes, distribution, clinical tests and posterior wall relationships.",
        "noteKey": "lumbar-plexus"
      }
    ]
  },
  {
    "id": "anat20040",
    "code": "ANAT20040",
    "name": "Neurosciences",
    "short": "Neurosciences",
    "icon": "✳",
    "art": "neuro",
    "color": "#b9e7db",
    "desc": "Neural systems, structures and circuits.",
    "lectures": []
  }
];
