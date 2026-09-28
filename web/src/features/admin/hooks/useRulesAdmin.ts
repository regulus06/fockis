import { useState } from "react";


export interface Rule {

  type: "country" | "city" | "state";

  value: string;

  action: "block" | "allow";

  reason?: string;

}



export default function useRulesAdmin() {


  const [rules, setRules] = useState<Rule[]>([
    {
      type: "country",
      value: "",
      action: "block",
      reason: "",
    },
  ]);




  const stats = {

    total: rules.length,

    blocks: rules.filter(
      (rule) => rule.action === "block"
    ).length,


    allows: rules.filter(
      (rule) => rule.action === "allow"
    ).length,

  };






  function updateRule(
    index: number,
    key: keyof Rule,
    value: string
  ) {


    setRules((current) =>

      current.map((rule, i) =>

        i === index

          ? {
              ...rule,
              [key]: value,
            }

          : rule

      )

    );


  }






  function addRule() {


    setRules((current) => [

      ...current,

      {
        type: "country",
        value: "",
        action: "block",
        reason: "",
      },

    ]);


  }






  function save() {


    console.log(
      "Saving rules:",
      rules
    );


    // Later connect:
    // await adminApi.saveRules(rules)

  }






  return {

    rules,

    stats,

    updateRule,

    addRule,

    save,

  };


}