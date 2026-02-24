import asyncio
import sys
import yaml
from pathlib import Path

# Add backend to path
sys.path.append(str(Path(__file__).parent.parent))

from app.services.template_validator import TemplateValidator

async def main():
    templates_dir = Path("templates")
    validator = TemplateValidator()
    
    files_to_test = ["medical-device.yaml", "gantt-chart-demo-full.yaml"]
    success = True
    
    for filename in files_to_test:
        filepath = templates_dir / filename
        if not filepath.exists():
            print(f"Skipping {filename}: not found")
            continue
            
        print(f"\\nValidating {filename}...")
        try:
            with open(filepath, 'r') as f:
                template_data = yaml.safe_load(f)
                
            isValid, errors = await validator.validate_template(template_data)
            
            if isValid:
                print(f"\\u2713 {filename} is VALID")
            else:
                success = False
                print(f"\\u2717 {filename} is INVALID:")
                for error in errors:
                    print(f"  - {error}")
                    
        except Exception as e:
            success = False
            print(f"\\u2717 Error validating {filename}: {e}")
            import traceback
            traceback.print_exc()

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())
