import argparse
import secrets
from pathlib import Path
from datetime import datetime

from state import write_state

timestamp = datetime.now()
default_run_id = secrets.token_urlsafe(6)

parser = argparse.ArgumentParser()
parser.add_argument(
    "--input_dir",
    required=True,
    help="Directory of article metadata JSON files to segment",
)
parser.add_argument(
    "--run_id",
    default=default_run_id,
    help="A unique run ID for the new pipeline run",
)
parser.add_argument(
    "--root_dir",
    help="Directory to store the output of the pipeline",
)

args = parser.parse_args()

if args.root_dir:
    root_dir = Path(args.root_dir)
else:
    root_dir = Path(f"stance_detection_{args.run_id}")

root_dir.mkdir(parents=True, exist_ok=True)

state_update = {
    "run_id": args.run_id,
    "created_at": timestamp.isoformat(),
    "input_dir": args.input_dir,
    "root_dir": args.root_dir,
}

write_state(args.root_dir, state_update)
