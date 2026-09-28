import useRulesAdmin from "../hooks/useRulesAdmin";
import RuleEditor from "../components/RuleEditor";
import StrictModeToggle from "../components/StrictModeToggle";

export default function RulesAdminDashboard() {

  const {
    rules,
    stats,
    updateRule,
    addRule,
    save,
  } = useRulesAdmin();



  return (

    <div
      style={{
        padding:20,
        maxWidth:900,
        margin:"0 auto",
      }}
    >

      <h2>
        🧠 Enterprise Rules Engine
      </h2>


      <StrictModeToggle />



      <div
        style={{
          display:"flex",
          gap:20,
          marginTop:20,
          marginBottom:20,
        }}
      >

        <div>
          📊 Total:
          {" "}
          {stats.total}
        </div>


        <div>
          🚫 Blocks:
          {" "}
          {stats.blocks}
        </div>


        <div>
          ✅ Allows:
          {" "}
          {stats.allows}
        </div>


      </div>




      <button onClick={addRule}>
        + Add Rule
      </button>




      <div
        style={{
          marginTop:20,
          display:"flex",
          flexDirection:"column",
          gap:10,
        }}
      >

        {
          rules.map((rule,index)=>(

            <RuleEditor

              key={index}

              rule={rule}

              onChange={
                (key,value)=>
                  updateRule(
                    index,
                    key as any,
                    value
                  )
              }

            />

          ))
        }


      </div>





      <button

        onClick={save}

        style={{
          marginTop:25,
        }}

      >

        💾 Save Rules

      </button>



    </div>

  );

}