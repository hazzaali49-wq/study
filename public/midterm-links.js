/* Shared mapping between high-yield lecture slides and related MDSA20030 midterm questions.
   Exact old-paper wording was not recoverable for every prompt, so displayed questions are
   explicitly labelled as reconstructed from the recovered past-midterm topic/prompt. */
(()=>{
'use strict';
const LABEL='PRACTICE QUESTION';
const NOTE='Practice question linked to this slide — not an exact past-paper question.';
const PAPER_B='Past Midterm · median B (63.33%) · 201/203 submissions';
const PAPER_A='Past Midterm · median A− (78.33%)';
const q=(question,topic)=>({question,topic:topic||'',label:LABEL,note:NOTE,exact:false});
const past=(question,topic,paper,ref)=>({question,topic:topic||'',label:'PAST MIDTERM QUESTION',note:'Exact wording from the supplied past-midterm feedback.',paper,ref,exact:true});
const slides={
 '/lectures/hypothalamus-pituitary.html':{
  14:[q('How does a rise in plasma osmolality increase AVP secretion and water conservation?','AVP control')],
  15:[q('Which physiological changes stimulate AVP release, and why?','AVP control')],
  16:[q('Explain the negative-feedback loop that restores plasma osmolality after AVP release.','Water homeostasis')],
  17:[q('Explain the feedback control of AVP during a change in body-water balance.','Water homeostasis')],
  18:[q('Name the major stimuli for AVP secretion and predict the direction of the response.','AVP control')],
  19:[q('Trace V2-receptor activation in a collecting-duct principal cell to aquaporin-2 insertion.','V2 / AQP2')],
  20:[q('Differentiate central from nephrogenic diabetes insipidus.','Diabetes insipidus')],
  21:[q('Interpret a water-deprivation test followed by desmopressin. What result suggests central diabetes insipidus?','Water-deprivation test')],
  22:[q('Contrast diabetes insipidus with SIADH using urine concentration and body-water balance.','DI vs SIADH')],
  25:[q('Where is oxytocin synthesised and how does it reach the systemic circulation?','Oxytocin')],
  26:[q('Distinguish prolactin-driven milk production from oxytocin-driven milk ejection.','Lactation')],
  27:[q('Explain the positive-feedback mechanism involved in oxytocin release during labour.','Oxytocin feedback')]
 },
 '/lectures/anterior-pituitary.html':{
  4:[q('What is a neuroendocrine cell, and how can a hypothalamic neuron control an endocrine gland?','Neuroendocrine signalling')],
  7:[q('Why does the anterior pituitary use a hypophyseal portal circulation rather than direct systemic release from hypothalamic neurons?','Portal circulation')],
  8:[q('For one anterior-pituitary axis, identify the hypothalamic regulator, pituitary hormone, target organ and feedback hormone.','Pituitary axis')],
  10:[q('Contrast the embryological origins of the adenohypophysis and neurohypophysis.','Pituitary embryology')],
  11:[q('How does Rathke pouch development explain the origin of the anterior pituitary?','Rathke pouch')],
  14:[q('Match the main anterior-pituitary cell types with the hormones they secrete.','Pituitary cell types')],
  15:[q('How would you recognise the major anterior-pituitary endocrine cell populations in a histology question?','Pituitary histology')],
  16:[q('Link anterior-pituitary histology to the hormone-producing cell types.','Pituitary histology')],
  23:[q('Why is prolactin unusual among anterior-pituitary hormones in being under tonic dopaminergic inhibition?','Prolactin')],
  24:[q('What stimulates prolactin secretion during breastfeeding?','Prolactin')],
  25:[q('Separate the roles of prolactin and oxytocin in lactation.','Lactation')],
  26:[q('Trace the suckling reflex from nipple stimulation to prolactin release.','Suckling reflex')],
  27:[q('Why can breastfeeding suppress the reproductive axis and delay menstruation?','Prolactin / GnRH')],
  28:[q('Predict the reproductive effects of hyperprolactinaemia and explain the mechanism.','Hyperprolactinaemia')]
 },
 '/lectures/growth-hormone-igf-axis.html':{
  4:[q('Explain how GHRH, somatostatin, GH and IGF-I regulate the GH axis by feedback.','GH regulation')],
  5:[q('Why is a single random GH measurement difficult to interpret?','Pulsatile GH')],
  6:[q('Trace the GH → IGF-I axis from pituitary secretion to target-tissue growth.','GH / IGF-I axis')],
  8:[q('How do GH and IGF-I contribute to linear growth at the epiphyseal growth plate?','Growth plate')],
  18:[q('Distinguish GH deficiency from GH resistance using expected GH and IGF-I concentrations.','GH resistance')],
  20:[q('Give one mechanism that can cause acquired GH resistance and predict the endocrine pattern.','GH resistance')],
  22:[q('Why does GH excess before epiphyseal closure cause gigantism, whereas excess after closure causes acromegaly?','GH excess')],
  25:[q('List the major clinical effects of chronic GH excess in acromegaly.','Acromegaly')]
 },
 '/lectures/thyroid-physiology.html':{
  4:[q('Identify a thyroid follicle and explain the roles of follicular cells and colloid.','Thyroid histology')],
  6:[q('Which thyroid cell produces calcitonin, and how is it different from a follicular cell?','C cells')],
  7:[q('Describe the first steps of thyroid-hormone synthesis from iodide and tyrosine.','Thyroid synthesis')],
  8:[q('What is thyroglobulin and why is it essential for thyroid-hormone synthesis and storage?','Thyroglobulin')],
  9:[q('Describe thyroid-hormone synthesis from iodide uptake through organification and coupling.','Thyroid synthesis')],
  10:[q('Why is T4 the major thyroid output even though T3 is the more potent hormone?','T3 / T4')],
  11:[q('How are stored thyroid hormones retrieved from colloid for secretion?','Thyroid secretion')],
  12:[q('Explain how endocytosis and proteolysis release T3 and T4 from thyroglobulin.','Thyroid secretion')],
  15:[q('How does thyroid hormone enter a target cell and alter gene transcription?','Thyroid action')],
  21:[q('Use TRH → TSH → T3/T4 negative feedback to predict what happens when circulating thyroid hormone changes.','Thyroid feedback')],
  23:[q('Interpret low T3/T4 with high versus low TSH. Where is the lesion in each case?','Hypothyroidism labs')],
  29:[q('Interpret high T3/T4 with low versus high TSH. Where is the lesion in each case?','Hyperthyroidism labs')],
  30:[q('Explain Graves disease using TSH-receptor-stimulating antibodies and negative feedback.','Graves disease')]
 },
 '/lectures/calcium-homeostasis.html':{
  4:[q('Why does hypocalcaemia cause tetany, and what symptoms can hypercalcaemia cause?','Calcium symptoms')],
  8:[q('Differentiate osteoblasts, osteoclasts and osteocytes by function.','Bone cells')],
  14:[q('Which parathyroid cell secretes PTH, and what receptor does it use to sense extracellular calcium?','Parathyroid histology')],
  15:[q('Describe the relationship between ionised calcium concentration and PTH secretion.','PTH secretion')],
  19:[q('How does the calcium-sensing receptor regulate PTH secretion when plasma Ca²⁺ rises or falls?','CaSR')],
  20:[q('How can PTH raise plasma calcium while lowering plasma phosphate? Include bone and kidney.','PTH actions')],
  21:[q('Which nephron segment provides tightly regulated PTH-sensitive calcium reabsorption, and what happens to phosphate reabsorption?','Renal calcium handling')],
  23:[q('Trace vitamin D from skin to active calcitriol and state how PTH affects the kidney activation step.','Vitamin D activation')],
  25:[q('Integrate the response to low plasma calcium across parathyroid gland, bone, kidney and intestine.','Integrated calcium response')],
  28:[q('What biochemical pattern is expected in primary hyperparathyroidism? Explain why phosphate may be low.','Hyperparathyroidism')],
  29:[q('What biochemical pattern is expected in primary hypoparathyroidism, and why can tetany occur?','Hypoparathyroidism')],
  33:[q('Starting with low serum Ca²⁺, trace the complete PTH/calcitriol response that restores calcium.','Integrated calcium response')],
  34:[q('How does CaSR signalling inside a chief cell suppress PTH secretion?','CaSR signalling')]
 }
};
const exactSlides={
 '/lectures/hypothalamus-pituitary.html':{
  14:[past('Based on the presentation and labs, which hormone is likely deficient, and what is its normal site of synthesis and storage?','Central diabetes insipidus',PAPER_A,'Case 3 · Q1')],
  18:[past('Would you expect to see an increase in AVP levels in the primary plexus of the hypophyseal portal system in response to the hyperosmolality?','AVP release / portal circulation',PAPER_B,'Q3(ii)')],
  19:[past('Describe the normal physiological actions of this hormone on the kidney at the cellular level.','AVP · V2 · cAMP · AQP2',PAPER_A,'Case 3 · Q2')],
  20:[past('Based on the information provided, suggest the most plausible diagnosis – justify your reasoning.','Nephrogenic diabetes insipidus',PAPER_B,'Q3(i)'),past('Based on the presentation and labs, which hormone is likely deficient, and what is its normal site of synthesis and storage?','Central diabetes insipidus',PAPER_A,'Case 3 · Q1')],
  21:[past('The patient was given a dose of vasopressin and the urine osmolality and urine output were rechecked 1 hour later. Do you expect they will have changed – if so, please explain your reasoning.','Response to vasopressin in nephrogenic DI',PAPER_B,'Q3(iii)')]
 },
 '/lectures/anterior-pituitary.html':{
  7:[past('Would you expect to see an increase in AVP levels in the primary plexus of the hypophyseal portal system in response to the hyperosmolality?','Portal circulation versus posterior-pituitary release',PAPER_B,'Q3(ii)')],
  10:[past('Embryologically, from which structures do the anterior and posterior pituitary develop, and how does this relate to their functions?','Pituitary embryology',PAPER_A,'Case 3 · Q4')],
  11:[past('Embryologically, from which structures do the anterior and posterior pituitary develop, and how does this relate to their functions?','Pituitary embryology',PAPER_A,'Case 3 · Q4')],
  14:[past('In a histological section of the pituitary gland, how would you distinguish the posterior pituitary (neurohypophysis) from the anterior pituitary (adenohypophysis)?','Pituitary histology',PAPER_A,'Case 3 · Q3'),past('Briefly describe the histology of the pituitary gland.','Pituitary histology',PAPER_B,'Q3(iv)')],
  15:[past('In a histological section of the pituitary gland, how would you distinguish the posterior pituitary (neurohypophysis) from the anterior pituitary (adenohypophysis)?','Pituitary histology',PAPER_A,'Case 3 · Q3')],
  16:[past('Briefly describe the histology of the pituitary gland.','Pituitary histology',PAPER_B,'Q3(iv)')]
 },
 '/lectures/growth-hormone-igf-axis.html':{
  6:[past('Explain the significance and basis of the low IGF-I and hypoglycemia.','GH deficiency · IGF-I · glucose',PAPER_B,'Q1(ii)')],
  9:[past('Explain the significance and basis of the low IGF-I and hypoglycemia.','GH as a counter-insulin hormone',PAPER_B,'Q1(ii)')],
  15:[past('Based on the information provided what do you think is the most plausible diagnosis?','Growth-hormone deficiency in hypopituitarism',PAPER_B,'Q1(i)')],
  16:[past('Based on the information provided what do you think is the most plausible diagnosis?','Growth-hormone deficiency in hypopituitarism',PAPER_B,'Q1(i)')],
  21:[past('Based on the information provided what do you think is the most plausible diagnosis?','Adult GH deficiency',PAPER_B,'Q1(i)'),past('Explain the significance and basis of the low IGF-I and hypoglycemia.','GH deficiency · IGF-I · glucose',PAPER_B,'Q1(ii)')]
 },
 '/lectures/thyroid-physiology.html':{
  2:[past('Name the arterial blood supply to the thyroid gland and identify a clinically important nerve that runs close to the thyroid and may be injured during thyroid surgery. What is the functional consequence if that nerve is damaged?','Thyroid surgical anatomy',PAPER_A,'Case 1 · Q4')],
  3:[past('Name the arterial blood supply to the thyroid gland and identify a clinically important nerve that runs close to the thyroid and may be injured during thyroid surgery. What is the functional consequence if that nerve is damaged?','Thyroid surgical anatomy',PAPER_A,'Case 1 · Q4')],
  4:[past('Describe the normal histological appearance of the thyroid gland (major cell types and their arrangement). Which cell type synthesises thyroglobulin and which secretes calcitonin?','Thyroid histology',PAPER_A,'Case 1 · Q3')],
  5:[past('Describe the normal histological appearance of the thyroid gland (major cell types and their arrangement). Which cell type synthesises thyroglobulin and which secretes calcitonin?','Thyroid histology',PAPER_A,'Case 1 · Q3')],
  6:[past('Describe the normal histological appearance of the thyroid gland (major cell types and their arrangement). Which cell type synthesises thyroglobulin and which secretes calcitonin?','C cells / calcitonin',PAPER_A,'Case 1 · Q3')],
  7:[past('Predict the expected results of thyroid function tests and radioiodine uptake.','Iodide uptake / thyroid function',PAPER_A,'Case 1 · Q2')],
  8:[past('Describe the normal histological appearance of the thyroid gland (major cell types and their arrangement). Which cell type synthesises thyroglobulin and which secretes calcitonin?','Thyroglobulin',PAPER_A,'Case 1 · Q3')],
  9:[past('Predict the expected results of thyroid function tests and radioiodine uptake.','Iodide uptake and hormone synthesis',PAPER_A,'Case 1 · Q2')],
  10:[past('Predict the expected results of thyroid function tests and radioiodine uptake.','T3 / T4 interpretation',PAPER_A,'Case 1 · Q2')],
  21:[past('Predict the expected results of thyroid function tests and radioiodine uptake.','Thyroid feedback / function tests',PAPER_A,'Case 1 · Q2')],
  23:[past('Based on the information provided, suggest the most plausible diagnosis – justify your reasoning.','Hypothyroidism',PAPER_A,'Case 1 · Q1'),past('Predict the expected results of thyroid function tests and radioiodine uptake.','Thyroid function tests',PAPER_A,'Case 1 · Q2')],
  24:[past('Based on the information provided, suggest the most plausible diagnosis – justify your reasoning.','Hypothyroidism',PAPER_A,'Case 1 · Q1')],
  25:[past('Based on the information provided, suggest the most plausible diagnosis – justify your reasoning.','Hypothyroidism with goitre',PAPER_A,'Case 1 · Q1')],
  26:[past('Predict the expected results of thyroid function tests and radioiodine uptake.','Thyroid function tests',PAPER_A,'Case 1 · Q2')]
 },
 '/lectures/calcium-homeostasis.html':{
  4:[past('Based on the information provided, suggest the most plausible diagnosis – justify your reasoning.','Post-thyroidectomy hypoparathyroidism',PAPER_B,'Q2(i)'),past('Based on the information provided, suggest the most plausible diagnosis – justify your reasoning.','DiGeorge syndrome / hypoparathyroidism',PAPER_A,'Case 2 · Q1')],
  14:[past('Briefly describe the functional histology of the parathyroid.','Parathyroid histology',PAPER_B,'Q2(iv)')],
  15:[past('Describe in outline how calcium and phosphate levels are normally regulated.','Calcium / phosphate homeostasis',PAPER_B,'Q2(iii)')],
  19:[past('Describe in outline how calcium and phosphate levels are normally regulated.','PTH / CaSR',PAPER_B,'Q2(iii)')],
  20:[past('Describe in outline how calcium and phosphate levels are normally regulated.','PTH actions',PAPER_B,'Q2(iii)'),past('What is the normal action of parathyroid hormone (PTH) on the kidney?','Renal PTH actions',PAPER_A,'Case 2 · Q3')],
  21:[past('What is the normal action of parathyroid hormone (PTH) on the kidney?','Renal PTH actions',PAPER_A,'Case 2 · Q3')],
  23:[past('What is the normal action of parathyroid hormone (PTH) on the kidney?','1α-hydroxylase / calcitriol',PAPER_A,'Case 2 · Q3')],
  25:[past('Describe in outline how calcium and phosphate levels are normally regulated.','Integrated calcium homeostasis',PAPER_B,'Q2(iii)')],
  27:[past('How can one distinguish between true and pseudohypoparathyroidism?','PTH deficiency versus resistance',PAPER_A,'Case 2 · Q4')],
  29:[past('Based on the information provided, suggest the most plausible diagnosis – justify your reasoning.','Post-thyroidectomy hypoparathyroidism',PAPER_B,'Q2(i)'),past('How can one distinguish between true and pseudohypoparathyroidism?','PTH deficiency versus resistance',PAPER_A,'Case 2 · Q4')],
  33:[past('Describe in outline how calcium and phosphate levels are normally regulated.','Integrated calcium homeostasis',PAPER_B,'Q2(iii)'),past('What is the normal action of parathyroid hormone (PTH) on the kidney?','Renal PTH actions',PAPER_A,'Case 2 · Q3')]
 }
};
const reviewExact={
 '2':{
  0:past('What are the major anatomical relationships of the pituitary gland?','Pituitary relations',PAPER_B,'Q1(iii)'),
  1:past('Embryologically, from which structures do the anterior and posterior pituitary develop, and how does this relate to their functions?','Pituitary embryology',PAPER_A,'Case 3 · Q4'),
  3:past('Based on the presentation and labs, which hormone is likely deficient, and what is its normal site of synthesis and storage?','Hypothalamic nuclei / AVP',PAPER_A,'Case 3 · Q1')
 },
 '3':{
  0:past('Would you expect to see an increase in AVP levels in the primary plexus of the hypophyseal portal system in response to the hyperosmolality?','AVP control',PAPER_B,'Q3(ii)'),
  1:past('Describe the normal physiological actions of this hormone on the kidney at the cellular level.','AVP · V2 · AQP2',PAPER_A,'Case 3 · Q2'),
  2:past('Based on the information provided, suggest the most plausible diagnosis – justify your reasoning.','Nephrogenic DI',PAPER_B,'Q3(i)'),
  3:past('The patient was given a dose of vasopressin and the urine osmolality and urine output were rechecked 1 hour later. Do you expect they will have changed – if so, please explain your reasoning.','Vasopressin response',PAPER_B,'Q3(iii)')
 },
 '4':{
  0:past('Would you expect to see an increase in AVP levels in the primary plexus of the hypophyseal portal system in response to the hyperosmolality?','Portal circulation',PAPER_B,'Q3(ii)'),
  1:past('Embryologically, from which structures do the anterior and posterior pituitary develop, and how does this relate to their functions?','Pituitary embryology',PAPER_A,'Case 3 · Q4'),
  2:past('In a histological section of the pituitary gland, how would you distinguish the posterior pituitary (neurohypophysis) from the anterior pituitary (adenohypophysis)?','Pituitary histology',PAPER_A,'Case 3 · Q3')
 },
 '5':{
  0:past('Name the arterial blood supply to the thyroid gland and identify a clinically important nerve that runs close to the thyroid and may be injured during thyroid surgery. What is the functional consequence if that nerve is damaged?','Recurrent laryngeal nerve',PAPER_A,'Case 1 · Q4'),
  1:past('Name the arterial blood supply to the thyroid gland and identify a clinically important nerve that runs close to the thyroid and may be injured during thyroid surgery. What is the functional consequence if that nerve is damaged?','Thyroid arteries / RLN',PAPER_A,'Case 1 · Q4'),
  2:past('Briefly describe the development of the thyroid and parathyroid glands.','Thyroid / parathyroid development',PAPER_B,'Q2(ii)'),
  3:past('Describe the normal embryological origin of the parathyroid glands. Which pharyngeal pouches form which parathyroids?','Parathyroid embryology',PAPER_A,'Case 2 · Q2'),
  4:past('Describe the normal embryological origin of the parathyroid glands. Which pharyngeal pouches form which parathyroids?','Parathyroid embryology',PAPER_A,'Case 2 · Q2')
 },
 '6':{
  2:past('Explain the significance and basis of the low IGF-I and hypoglycemia.','GH deficiency',PAPER_B,'Q1(ii)')
 },
 '7':{
  0:past('Describe the normal histological appearance of the thyroid gland (major cell types and their arrangement). Which cell type synthesises thyroglobulin and which secretes calcitonin?','Thyroid histology',PAPER_A,'Case 1 · Q3'),
  1:past('Predict the expected results of thyroid function tests and radioiodine uptake.','Iodide uptake / thyroid function',PAPER_A,'Case 1 · Q2'),
  3:past('Predict the expected results of thyroid function tests and radioiodine uptake.','Thyroid feedback / function tests',PAPER_A,'Case 1 · Q2'),
  4:past('Based on the information provided, suggest the most plausible diagnosis – justify your reasoning.','Hypothyroidism',PAPER_A,'Case 1 · Q1')
 },
 '8':{
  0:past('Based on the information provided, suggest the most plausible diagnosis – justify your reasoning.','Hypocalcaemia / hypoparathyroidism',PAPER_B,'Q2(i)'),
  1:past('Briefly describe the functional histology of the parathyroid.','Parathyroid histology',PAPER_B,'Q2(iv)'),
  2:past('Describe in outline how calcium and phosphate levels are normally regulated.','PTH actions',PAPER_B,'Q2(iii)'),
  3:past('What is the normal action of parathyroid hormone (PTH) on the kidney?','PTH / vitamin D',PAPER_A,'Case 2 · Q3'),
  4:past('How can one distinguish between true and pseudohypoparathyroidism?','Parathyroid disorders',PAPER_A,'Case 2 · Q4'),
  5:past('Describe in outline how calcium and phosphate levels are normally regulated.','Integrated calcium homeostasis',PAPER_B,'Q2(iii)')
 }
};
const review={
 '1':[
  q('Distinguish endocrine from neuroendocrine signalling and give one example of each.','Signalling'),
  q('Compare receptor location and signalling for peptide hormones versus steroid/thyroid hormones.','Hormone receptors'),
  q('Explain negative feedback using one pituitary endocrine axis.','Negative feedback')
 ],
 '2':[
  q('State the important anatomical relations of the hypothalamus/pituitary, including the third ventricle and optic chiasm.','Pituitary anatomy'),
  q('Contrast the embryological origin of the anterior and posterior pituitary.','Pituitary embryology'),
  q('What is the infundibulum and what does it connect?','Pituitary structure'),
  q('Which hypothalamic nuclei are associated with posterior-pituitary hormones?','Hypothalamic nuclei')
 ],
 '3':[
  q('Explain how rising plasma osmolality increases AVP secretion and water retention.','Water balance'),
  q('Trace V2-receptor activation to aquaporin-2 insertion in a collecting-duct principal cell.','V2 / AQP2'),
  q('Differentiate central from nephrogenic diabetes insipidus.','Diabetes insipidus'),
  q('Interpret a water-deprivation/desmopressin test.','Water-deprivation test'),
  q('Contrast diabetes insipidus with SIADH.','DI vs SIADH')
 ],
 '4':[
  q('Why does the anterior pituitary use a hypophyseal portal circulation?','Portal circulation'),
  q('Contrast Rathke-pouch and neural ectoderm contributions to pituitary development.','Pituitary embryology'),
  q('Match the main anterior-pituitary cell types with their hormones.','Pituitary cell types'),
  q('Explain dopamine control of prolactin and predict effects of excess prolactin.','Prolactin')
 ],
 '5':[
  q('Which laryngeal nerve is at risk during thyroid surgery, and what deficit can follow injury?','Recurrent laryngeal nerve'),
  q('Describe the relationship between the inferior thyroid artery and recurrent laryngeal nerve that matters surgically.','Thyroid blood supply'),
  q('Name the key structures that must be protected during thyroidectomy.','Thyroidectomy'),
  q('Where are the parathyroid glands usually found, and why can their position vary?','Parathyroid anatomy'),
  q('Explain the developmental origin and main blood supply of the parathyroid glands.','Parathyroid development')
 ],
 '6':[
  q('Explain GHRH/somatostatin control of GH and IGF-I feedback.','GH regulation'),
  q('How do GH and IGF-I promote linear growth at the growth plate?','Growth plate'),
  q('Distinguish GH deficiency from GH resistance using GH and IGF-I.','GH resistance'),
  q('Why does GH excess cause gigantism before epiphyseal closure but acromegaly after it?','GH excess')
 ],
 '7':[
  q('Identify the key thyroid follicle structures and the role of C cells.','Thyroid histology'),
  q('Build T3/T4 from iodide: uptake → TPO/organification → coupling → storage → release.','Thyroid synthesis'),
  q('Explain T4/T3 transport, peripheral deiodination and cellular action.','Thyroid action'),
  q('Use TRH → TSH → T3/T4 feedback to interpret thyroid-function tests.','Thyroid feedback'),
  q('Distinguish primary hypo-/hyperthyroidism and explain Graves disease.','Thyroid disease')
 ],
 '8':[
  q('Explain the neuromuscular effects of low calcium and the major symptoms of high calcium.','Calcium symptoms'),
  q('Identify bone cells and parathyroid chief cells, and explain CaSR control of PTH.','Histology / CaSR'),
  q('How does PTH raise calcium while lowering phosphate? Include renal handling.','PTH actions'),
  q('Trace vitamin D activation and explain how calcitriol increases intestinal calcium absorption.','Vitamin D'),
  q('Interpret the laboratory patterns of hyperparathyroidism and hypoparathyroidism.','Parathyroid disorders'),
  q('Draw or explain the integrated low-Ca²⁺ → PTH → bone/kidney/gut response.','Integrated calcium response')
 ]
};
function normalise(id){
 const raw=String(id||'').split('?')[0].split('#')[0];
 if(!raw)return location.pathname;
 if(raw.startsWith('/'))return raw;
 if(raw.endsWith('.html'))return raw.startsWith('lectures/')?'/'+raw:'/lectures/'+raw;
 if(/^[a-z0-9-]+$/i.test(raw))return '/lectures/'+raw+'.html';
 try{return new URL(raw,location.href).pathname}catch{return raw}
}
function forSlide(id,n){const key=normalise(id),num=Number(n);return exactSlides[key]?.[num]||slides[key]?.[num]||[]}
function forReview(lecture,index){return reviewExact[String(lecture)]?.[Number(index)]||review[String(lecture)]?.[Number(index)]||null}
function allForLecture(id){const key=normalise(id);return {...(slides[key]||{}),...(exactSlides[key]||{})}}
window.StudyAtlasMidtermLinks={label:LABEL,note:NOTE,papers:{PAPER_A,PAPER_B},forSlide,forReview,allForLecture,review,reviewExact};
})();