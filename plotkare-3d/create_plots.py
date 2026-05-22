import bpy
import json
import os

# CLEAR SCENE
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete()

# FILE PATH
json_path = os.path.join(os.path.dirname(bpy.data.filepath), "plots.json")

# LOAD JSON
with open(json_path, "r") as file:
    plots = json.load(file)

# CREATE PLOTS
for plot in plots:

    x = plot["x"]
    y = plot["y"]
    width = plot["width"]
    height = plot["height"]
    name = plot["id"]

    bpy.ops.mesh.primitive_cube_add(
        location=(x, y, 1)
    )

    obj = bpy.context.object

    obj.name = name

    obj.scale[0] = width / 2
    obj.scale[1] = height / 2
    obj.scale[2] = 1

print("Plots created successfully!")