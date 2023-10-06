files=("salesforce-knowledge" "salesforce-case");

for index in "${!files[@]}";
do
  cp "${files[$index]}.ts" "${files[$index]}-sandbox.ts";
  echo '// AUTO-GENERATED FILE. DO NOT EDIT!\n' | cat - "${files[$index]}-sandbox.ts" > temp && mv temp "${files[$index]}-sandbox.ts";
done;
