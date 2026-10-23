// Optional instant feedback for the new source-preserving lecture pages.
(()=>{
  'use strict';
  if(!document.body.hasAttribute('data-instant-checks'))return;
  document.addEventListener('change',event=>{
    const input=event.target;
    if(!input.matches('.q input[type="radio"]'))return;
    const q=input.closest('.q'),feedback=q.querySelector('.feedback');
    if(!feedback)return;
    const correct=Number(input.value)===Number(q.dataset.answer);
    feedback.textContent=(correct?'Correct. ':'Not quite. Correct answer: '+feedback.dataset.correct+'. ')+feedback.dataset.exp;
    q.querySelectorAll('.atlas-options label').forEach(label=>{
      const option=label.querySelector('input');
      label.dataset.result=option===input?(correct?'correct':'incorrect'):'';
    });
    if(!q.querySelector('[data-retry-shuffle]')){
      const retry=document.createElement('button');
      retry.type='button';retry.dataset.retryShuffle='';retry.textContent='Try again · shuffle choices';
      feedback.after(retry);
    }
  });
  document.addEventListener('click',event=>{
    const retry=event.target.closest('[data-retry-shuffle]');
    if(!retry)return;
    const q=retry.closest('.q'),container=q.querySelector('.atlas-options');
    const labels=[...container.querySelectorAll('label')];
    const oldIndex=Number(q.dataset.answer),correct=labels.find(l=>Number(l.querySelector('input').value)===oldIndex);
    for(let i=labels.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[labels[i],labels[j]]=[labels[j],labels[i]];}
    // A retry must not train the same correct-answer position.
    if(labels.length>1&&labels.indexOf(correct)===oldIndex){
      const j=(oldIndex+1+Math.floor(Math.random()*(labels.length-1)))%labels.length;
      [labels[oldIndex],labels[j]]=[labels[j],labels[oldIndex]];
    }
    labels.forEach((label,i)=>{const input=label.querySelector('input');input.checked=false;input.value=String(i);label.dataset.result='';container.appendChild(label);});
    q.dataset.answer=String(labels.indexOf(correct));q.querySelector('.feedback').textContent='';retry.remove();
  });
})();
