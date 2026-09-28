type Rule = {
  type:"country"|"city"|"state";
  value:string;
  action:"block"|"allow";
  reason?:string;
};


type Props = {

  rule:Rule;

  onChange:
  (
    key:keyof Rule,
    value:any
  )=>void;

};



export default function RuleEditor({
  rule,
  onChange,
}:Props){


return (

<div

style={{
display:"flex",
gap:10,
alignItems:"center",
}}

>


<select

value={rule.type}

onChange={(e)=>
onChange(
"type",
e.target.value
)}

>

<option value="country">
Country
</option>

<option value="city">
City
</option>

<option value="state">
State
</option>


</select>




<input

value={rule.value}

onChange={(e)=>
onChange(
"value",
e.target.value
)}

placeholder="value"

/>





<select

value={rule.action}

onChange={(e)=>
onChange(
"action",
e.target.value
)}

>


<option value="block">
Block
</option>


<option value="allow">
Allow
</option>


</select>





<input

value={rule.reason || ""}

onChange={(e)=>
onChange(
"reason",
e.target.value
)}

placeholder="reason"

/>



</div>

);


}