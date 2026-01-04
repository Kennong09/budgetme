import{j as e}from"./ui-vendor-Cn1Vfl4w.js";import{u as Q,r as o}from"./react-vendor-D4A9EtXC.js";import{s as P}from"./index-BbApZ7g3.js";import"./chart-vendor-B0c7K_uV.js";const J=`
  .input-success {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1) !important;
  }
  
  .input-success:focus {
    border-color: #10b981 !important;
    box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2) !important;
  }
  
  .input-warning {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1) !important;
  }
  
  .input-warning:focus {
    border-color: #3b82f6 !important;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2) !important;
  }
  
  /* Password Strength Validation Styles */
  .password-strength-container {
    margin-top: 8px;
  }
  
  .password-strength-meter {
    display: flex;
    gap: 2px;
    margin-bottom: 8px;
  }
  
  .strength-bar {
    height: 4px;
    border-radius: 2px;
    flex: 1;
    background-color: #e2e8f0;
    transition: background-color 0.3s ease;
  }
  
  .strength-bar.weak { background-color: #ef4444; }
  .strength-bar.fair { background-color: #f59e0b; }
  .strength-bar.good { background-color: #3b82f6; }
  .strength-bar.strong { background-color: #10b981; }
  
  .password-strength-label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 8px;
  }
  
  .strength-weak { color: #ef4444; }
  .strength-fair { color: #f59e0b; }
  .strength-good { color: #3b82f6; }
  .strength-strong { color: #10b981; }
  
  .password-requirements {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4px;
    font-size: 12px;
  }
  
  .requirement-item {
    display: flex;
    align-items: center;
    gap: 6px;
    transition: color 0.3s ease;
  }
  
  .requirement-item.met {
    color: #10b981;
  }
  
  .requirement-item.unmet {
    color: #64748b;
  }
  
  .requirement-item i {
    font-size: 14px;
  }
  
  .password-suggestions {
    margin-top: 8px;
    padding: 8px;
    background: rgba(79, 114, 255, 0.05);
    border-radius: 6px;
    border-left: 3px solid #4f72ff;
  }
  
  .suggestions-title {
    font-size: 12px;
    font-weight: 600;
    color: #4f72ff;
    margin-bottom: 4px;
  }
  
  .suggestions-list {
    font-size: 11px;
    color: #64748b;
    line-height: 1.4;
  }

  .requirement {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    transition: color 0.3s ease;
    margin-bottom: 8px;
  }

  .requirement.valid {
    color: #10b981;
  }

  .requirement.invalid {
    color: #64748b;
  }

  .requirement i {
    font-size: 16px;
    width: 16px;
  }

  .requirements-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 12px;
  }

  .success-message {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
    color: #10b981;
    margin-top: 4px;
  }

  .success-message i {
    font-size: 16px;
  }

  .error-message {
    color: #ef4444;
    font-size: 14px;
    margin-top: 4px;
  }

  .enhanced-input.no-left-icon {
    padding-left: 12px;
  }
`,re=()=>{const v=Q(),[R,S]=o.useState(!0),[b,p]=o.useState(!1),[w,I]=o.useState(!1),[q,F]=o.useState(!1),[k,g]=o.useState(null),[O,L]=o.useState(0),[i,A]=o.useState(""),[a,H]=o.useState(""),[j,M]=o.useState(!1),[N,D]=o.useState(!1),[n,y]=o.useState({}),[s,Y]=o.useState({strength:"weak",score:0,hasUppercase:!1,hasLowercase:!1,hasNumber:!1,hasSymbol:!1,hasMinLength:!1,suggestions:[]}),_=o.useRef(null),T=o.useRef(null),$=o.useRef(null),x=o.useRef(null),E=o.useCallback(r=>{const l=/[A-Z]/.test(r),t=/[a-z]/.test(r),m=/\d/.test(r),u=/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(r),f=r.length>=8;let c=0;const d=[];f?c+=1:d.push("Use at least 8 characters"),l?c+=1:d.push("Add uppercase letters (A-Z)"),t?c+=1:d.push("Add lowercase letters (a-z)"),m?c+=1:d.push("Add numbers (0-9)"),u?c+=1:d.push("Add symbols (!@#$%^&*)");let h;return c<=1?h="weak":c<=2?h="fair":c<=3?h="good":h="strong",{strength:h,score:c,hasUppercase:l,hasLowercase:t,hasNumber:m,hasSymbol:u,hasMinLength:f,suggestions:d}},[]),Z=o.useCallback(r=>{A(r),n.newPassword&&y(t=>({...t,newPassword:""})),n.confirmPassword&&a&&r===a&&y(t=>({...t,confirmPassword:""}));const l=E(r);Y(l)},[n.newPassword,n.confirmPassword,a,E]);o.useEffect(()=>{let r=!0;return(async()=>{if(!r)return;S(!0),g(null);const t=new URLSearchParams(window.location.hash.substring(1)),m=new URLSearchParams(window.location.search);console.log("🔍 URL Debug Info:"),console.log("Full URL:",window.location.href),console.log("Hash:",window.location.hash),console.log("Search:",window.location.search),console.log("Hash Params:",Object.fromEntries(t.entries())),console.log("Query Params:",Object.fromEntries(m.entries()));const u=t.get("access_token")||t.get("token")||t.get("confirmation_token")||t.get("token_hash")||m.get("access_token")||m.get("token")||m.get("confirmation_token")||m.get("token_hash"),f=t.get("refresh_token")||m.get("refresh_token"),c=t.get("type")||m.get("type");if(console.log("🔑 Extracted tokens:"),console.log("Reset Token:",u?`${u.substring(0,20)}...`:"null"),console.log("Refresh Token:",f?`${f.substring(0,20)}...`:"null"),console.log("Type:",c),!u){console.error("❌ No reset token found in URL parameters"),r&&(g("Invalid reset link. Please request a new password reset."),p(!1),S(!1));return}try{const d=c==="recovery"||!c,h=u&&u.length>15;if(console.log("🔍 Token validation:"),console.log("Is valid type:",d,"(type:",c,")"),console.log("Is valid token format:",h,"(length:",u?.length,")"),!r)return;h?d?(console.log("✅ Token validation passed - user can proceed"),p(!0)):(console.error("❌ Invalid token type"),g("Invalid reset link type. Please request a new password reset."),p(!1)):(console.error("❌ Invalid token format"),g("Invalid reset link format. Please request a new password reset."),p(!1))}catch(d){if(!r)return;console.error("Token verification error:",d),g("Failed to verify reset link. Please request a new password reset."),p(!1)}finally{r&&S(!1)}})(),()=>{r=!1}},[]),o.useEffect(()=>()=>{x.current&&clearInterval(x.current)},[]);const B=()=>{const r={};return i?i.length<8?r.newPassword="Password must be at least 8 characters":s.strength==="weak"&&(r.newPassword="Password does not meet security requirements"):r.newPassword="New password is required",a?i!==a&&(r.confirmPassword="Passwords do not match"):r.confirmPassword="Please confirm your password",y(r),Object.keys(r).length===0},G=async r=>{if(r.preventDefault(),!b){g("Invalid reset link. Please request a new password reset.");return}if(!B()){$.current?.querySelector(".input-error input")?.focus();return}I(!0),g(null);try{const l=new URLSearchParams(window.location.hash.substring(1)),t=new URLSearchParams(window.location.search),m=l.get("access_token")||l.get("token")||l.get("confirmation_token")||l.get("token_hash")||t.get("access_token")||t.get("token")||t.get("confirmation_token")||t.get("token_hash"),u=l.get("refresh_token")||t.get("refresh_token");if(console.log("🔄 Password Reset Submit - Token Info:"),console.log("Reset Token:",m?`${m.substring(0,20)}...`:"null"),console.log("Refresh Token:",u?`${u.substring(0,20)}...`:"null"),!m)throw new Error("Reset token not found. Please request a new password reset.");if(t.get("token_hash")||l.get("token_hash")){console.log("🔐 Verifying OTP with token_hash...");const{data:d,error:h}=await P.auth.verifyOtp({token_hash:m,type:"recovery"});if(h){console.error("❌ OTP verification failed:",h);const V=h.message?.toLowerCase()||"";if(h.status===403||V.includes("invalid")||V.includes("expired")){g("Invalid or expired reset link. Please request a new password reset."),p(!1);return}throw new Error("Invalid or expired reset token. Please request a new password reset.")}console.log("✅ OTP verified successfully:",d?.session?.user?.id||"No user ID")}else{console.log("🔐 Establishing session with tokens...");const{data:d,error:h}=await P.auth.setSession({access_token:m,refresh_token:u||""});if(h)throw console.error("❌ Session establishment failed:",h),new Error("Invalid or expired reset token. Please request a new password reset.");console.log("✅ Session established successfully:",d?.session?.user?.id||"No user ID")}console.log("🔄 Updating password...");const{error:c}=await P.auth.updateUser({password:i});if(c)throw console.error("❌ Password update failed:",c),new Error(c.message||"Failed to update password");console.log("✅ Password updated successfully"),await P.auth.signOut(),F(!0),L(5),x.current=setInterval(()=>{L(d=>d<=1?(x.current&&(clearInterval(x.current),x.current=null),v("/",{state:{showLogin:!0}}),0):d-1)},1e3),setTimeout(()=>{T.current?.focus()},100)}catch(l){console.error("Password update error:",l),g(l.message||"An unexpected error occurred. Please try again."),setTimeout(()=>{_.current?.focus()},100)}finally{I(!1)}},z=()=>{v("/",{state:{activeTab:"reset"}})},C=()=>{x.current&&(clearInterval(x.current),x.current=null),v("/",{state:{showLogin:!0}})},U=b&&s.strength!=="weak"&&s.hasMinLength&&s.hasUppercase&&s.hasLowercase&&s.hasNumber&&s.hasSymbol&&i===a&&i.length>0&&a.length>0;return e.jsxs("div",{className:"landing-page",children:[e.jsx("style",{dangerouslySetInnerHTML:{__html:J}}),e.jsx("div",{className:"modal-overlay animate__animated animate__fadeIn",children:e.jsxs("div",{className:"modal-container animate__animated animate__fadeInUp",children:[e.jsxs("div",{className:"modal-header",children:[e.jsx("div",{className:"logo-container",children:e.jsxs("div",{className:"logo",children:[e.jsx("div",{className:"logo-icon",children:e.jsx("i",{className:"fas fa-wallet text-white"})}),e.jsx("span",{className:"logo-text",children:"BudgetMe"})]})}),e.jsx("button",{className:"close-btn",onClick:()=>v("/"),"aria-label":"Close and return to home",children:e.jsx("i",{className:"bx bx-x"})})]}),e.jsxs("div",{className:"modal-body",children:[R&&e.jsxs("div",{className:"text-center",role:"status","aria-live":"polite",children:[e.jsx("div",{className:"mb-4",children:e.jsx("i",{className:"bx bx-loader-alt bx-spin",style:{fontSize:"3rem",color:"var(--landing-primary)"}})}),e.jsx("h2",{className:"modal-title mb-4",children:"Verifying Reset Link"}),e.jsx("p",{children:"Please wait while we verify your password reset link..."})]}),!R&&!b&&k&&e.jsxs("div",{className:"text-center",children:[e.jsx("div",{className:"mb-4",children:e.jsx("i",{className:"bx bx-error-circle",style:{fontSize:"3rem",color:"#ef4444"}})}),e.jsx("h2",{className:"modal-title mb-4",children:"Reset Link Invalid"}),e.jsxs("div",{className:"auth-error-message",ref:_,tabIndex:-1,role:"alert","aria-live":"assertive",children:[e.jsx("i",{className:"bx bx-error-circle"}),k]}),e.jsxs("div",{className:"verification-actions mt-4",children:[e.jsxs("button",{className:"btn-primary",onClick:z,type:"button",children:[e.jsx("i",{className:"bx bx-envelope"})," Request New Reset"]}),e.jsxs("button",{className:"btn-secondary",onClick:C,type:"button",children:[e.jsx("i",{className:"bx bx-log-in"})," Back to Login"]})]})]}),q&&e.jsxs("div",{className:"text-center",children:[e.jsx("div",{className:"mb-4",children:e.jsx("i",{className:"bx bx-check-circle",style:{fontSize:"3rem",color:"#22c55e"}})}),e.jsx("h2",{className:"modal-title mb-4",ref:T,tabIndex:-1,children:"Password Updated Successfully!"}),e.jsxs("div",{className:"auth-success-message",role:"status","aria-live":"polite",children:[e.jsx("i",{className:"bx bx-check-circle"}),"Your password has been updated. You've been signed out for security."]}),e.jsxs("p",{className:"mb-4",children:["Redirecting to login in ",e.jsx("strong",{children:O})," seconds..."]}),e.jsx("button",{className:"btn-primary",onClick:C,type:"button",children:"Login Now"})]}),b&&!q&&e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"text-center mb-4",children:[e.jsx("div",{className:"mb-3",children:e.jsx("i",{className:"bx bx-shield-quarter",style:{fontSize:"3rem",color:"var(--landing-primary)"}})}),e.jsx("h2",{className:"modal-title",children:"Set New Password"}),e.jsx("p",{children:"Enter a strong password to secure your account."})]}),k&&e.jsxs("div",{className:"auth-error-message",ref:_,tabIndex:-1,role:"alert","aria-live":"assertive",children:[e.jsx("i",{className:"bx bx-error-circle"}),k]}),e.jsxs("form",{onSubmit:G,ref:$,role:"form",noValidate:!0,children:[e.jsxs("div",{className:"form-group",children:[e.jsx("label",{htmlFor:"new-password",children:"New Password"}),e.jsxs("div",{className:`input-with-icon password-field ${n.newPassword?"input-error":s.strength==="strong"?"input-success":s.strength==="good"?"input-warning":""}`,children:[!n.newPassword&&i.length===0&&e.jsx("i",{className:"bx bx-lock-alt"}),e.jsx("input",{type:j?"text":"password",id:"new-password",value:i,onChange:r=>Z(r.target.value),placeholder:"Enter your new password",className:`enhanced-input ${n.newPassword||i.length>0?"no-left-icon":""}`,required:!0,disabled:w,"aria-describedby":n.newPassword?"new-password-error":"password-requirements"}),e.jsx("button",{type:"button",className:"toggle-password-inline",onClick:()=>M(!j),tabIndex:-1,"aria-label":j?"Hide password":"Show password","aria-pressed":j,children:e.jsx("i",{className:`bx ${j?"bx-hide":"bx-show"}`})}),i.length>0&&s.strength==="strong"&&e.jsx("i",{className:"bx bx-check-circle",style:{position:"absolute",right:"44px",top:"50%",transform:"translateY(-50%)",color:"#10b981",fontSize:"18px"}}),i.length>0&&s.strength!=="strong"&&e.jsx("i",{className:"bx bx-info-circle",style:{position:"absolute",right:"44px",top:"50%",transform:"translateY(-50%)",color:s.strength==="good"?"#3b82f6":s.strength==="fair"?"#f59e0b":"#ef4444",fontSize:"18px"}})]}),n.newPassword&&e.jsx("div",{className:"error-message",id:"new-password-error",role:"alert",children:n.newPassword}),i.length>0&&e.jsxs("div",{className:"password-strength-container",children:[e.jsx("div",{className:"password-strength-meter",children:[1,2,3,4,5].map(r=>e.jsx("div",{className:`strength-bar ${r<=s.score?s.strength:""}`},r))}),e.jsxs("div",{className:`password-strength-label strength-${s.strength}`,children:[e.jsx("i",{className:`bx ${s.strength==="strong"?"bxs-shield-check":s.strength==="good"?"bxs-shield":s.strength==="fair"?"bxs-shield-minus":"bxs-shield-x"}`}),"Password strength: ",s.strength.charAt(0).toUpperCase()+s.strength.slice(1)]}),e.jsxs("div",{className:"password-requirements",children:[e.jsxs("div",{className:`requirement-item ${s.hasMinLength?"met":"unmet"}`,children:[e.jsx("i",{className:`bx ${s.hasMinLength?"bx-check":"bx-x"}`}),e.jsx("span",{children:"8+ characters"})]}),e.jsxs("div",{className:`requirement-item ${s.hasUppercase?"met":"unmet"}`,children:[e.jsx("i",{className:`bx ${s.hasUppercase?"bx-check":"bx-x"}`}),e.jsx("span",{children:"Uppercase (A-Z)"})]}),e.jsxs("div",{className:`requirement-item ${s.hasLowercase?"met":"unmet"}`,children:[e.jsx("i",{className:`bx ${s.hasLowercase?"bx-check":"bx-x"}`}),e.jsx("span",{children:"Lowercase (a-z)"})]}),e.jsxs("div",{className:`requirement-item ${s.hasNumber?"met":"unmet"}`,children:[e.jsx("i",{className:`bx ${s.hasNumber?"bx-check":"bx-x"}`}),e.jsx("span",{children:"Number (0-9)"})]}),e.jsxs("div",{className:`requirement-item ${s.hasSymbol?"met":"unmet"}`,children:[e.jsx("i",{className:`bx ${s.hasSymbol?"bx-check":"bx-x"}`}),e.jsx("span",{children:"Symbol (!@#$)"})]})]}),s.suggestions.length>0&&e.jsxs("div",{className:"password-suggestions",children:[e.jsx("div",{className:"suggestions-title",children:"💡 To strengthen your password:"}),e.jsx("div",{className:"suggestions-list",children:s.suggestions.join(" • ")})]})]})]}),e.jsxs("div",{className:"form-group",children:[e.jsx("label",{htmlFor:"confirm-password",children:"Confirm New Password"}),e.jsxs("div",{className:`input-with-icon password-field ${n.confirmPassword?"input-error":a.length>0&&i===a?"input-success":a.length>0&&i!==a?"input-error":""}`,children:[!n.confirmPassword&&a.length===0&&e.jsx("i",{className:"bx bx-lock-alt"}),e.jsx("input",{type:N?"text":"password",id:"confirm-password",value:a,onChange:r=>{const l=r.target.value;H(l),n.confirmPassword&&y(t=>({...t,confirmPassword:""}))},placeholder:"Confirm your new password",className:`enhanced-input ${n.confirmPassword||a.length>0?"no-left-icon":""}`,required:!0,disabled:w,"aria-describedby":n.confirmPassword?"confirm-password-error":void 0}),e.jsx("button",{type:"button",className:"toggle-password-inline",onClick:()=>D(!N),tabIndex:-1,"aria-label":N?"Hide password":"Show password","aria-pressed":N,children:e.jsx("i",{className:`bx ${N?"bx-hide":"bx-show"}`})}),a.length>0&&i===a&&e.jsx("i",{className:"bx bx-check-circle",style:{position:"absolute",right:"44px",top:"50%",transform:"translateY(-50%)",color:"#10b981",fontSize:"18px"}}),a.length>0&&i!==a&&e.jsx("i",{className:"bx bx-x-circle",style:{position:"absolute",right:"44px",top:"50%",transform:"translateY(-50%)",color:"#ef4444",fontSize:"18px"}})]}),n.confirmPassword&&e.jsx("div",{className:"error-message",id:"confirm-password-error",role:"alert",children:n.confirmPassword}),!n.confirmPassword&&a.length>0&&i===a&&e.jsxs("div",{className:"success-message",style:{color:"#10b981",fontSize:"14px",marginTop:"4px"},children:[e.jsx("i",{className:"bx bx-check-circle"})," Passwords match"]}),!n.confirmPassword&&a.length>0&&i!==a&&e.jsx("div",{className:"error-message",children:"Passwords do not match"})]}),e.jsx("button",{type:"submit",className:"btn-primary btn-block reset-btn",disabled:w||!U,style:{transition:"all 0.3s ease",transform:w?"scale(0.98)":"scale(1)",opacity:U?1:.6},children:w?e.jsxs(e.Fragment,{children:[e.jsx("i",{className:"bx bx-loader-alt bx-spin"})," Updating Password..."]}):e.jsxs(e.Fragment,{children:[e.jsx("i",{className:"bx bx-check"})," Update Password"]})})]})]})]}),b&&!q&&e.jsx("div",{className:"modal-footer",children:e.jsxs("p",{children:["Need help?"," ",e.jsx("button",{className:"text-btn",onClick:z,type:"button",children:"Request New Reset Link"})]})})]})})]})};export{re as default};
