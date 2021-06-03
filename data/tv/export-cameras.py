import bpy
import math

file = open("C:\\Users\\hypo\\Desktop\\tv\\cameras.txt", 'w')
scene = bpy.context.scene

img_count = 1

file.write('#\n')
file.write('#\n')
file.write('#\n')

objects = bpy.context.scene.objects
for obj in objects:
  if obj.type == "CAMERA":
    file.write(str(img_count) + ' . 960 540 ' + str( 270 / math.tan(obj.data.angle / 2) ) + '\n')
    img_count = img_count + 1

file.close()
